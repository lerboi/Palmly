package com.margelo.nitro.palmly

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.SystemClock
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker.HandLandmarkerOptions as MPOptions
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult as MPResult

/**
 * The shared MediaPipe HandLandmarker engine behind both the standalone `detect()` hybrid and
 * the camera-output analyzer. VIDEO running mode: detection is synchronous on the caller's
 * thread, so callers may release the source image as soon as a call returns (P2 Decision Log).
 */
internal class LandmarkerCore(context: Context, options: HandLandmarkerOptions?) {
  private val landmarker: HandLandmarker = run {
    val delegate = when (options?.delegate) {
      HandDelegate.CPU -> Delegate.CPU
      else -> Delegate.GPU // Backend §2.2 default
    }
    val base = BaseOptions.builder()
      .setModelAssetPath(MODEL_ASSET)
      .setDelegate(delegate)
      .build()
    val mpOptions = MPOptions.builder()
      .setBaseOptions(base)
      .setRunningMode(RunningMode.VIDEO)
      .setNumHands((options?.numHands ?: 1.0).toInt())
      .setMinHandDetectionConfidence((options?.minHandDetectionConfidence ?: 0.5).toFloat())
      .setMinHandPresenceConfidence((options?.minHandPresenceConfidence ?: 0.5).toFloat())
      .setMinTrackingConfidence((options?.minTrackingConfidence ?: 0.5).toFloat())
      .build()
    HandLandmarker.createFromOptions(context, mpOptions)
  }

  // VIDEO mode requires strictly monotonically increasing timestamps.
  private var lastTimestampMs = 0L

  /**
   * Run the landmarker on an upright-unaware [bitmap] captured at [rotationDegrees], and map to
   * the Nitro result struct. The bitmap is physically rotated upright BEFORE inference (the
   * Google HandLandmarker sample's live-camera approach) — passing rotation via
   * `ImageProcessingOptions` instead leaves the returned landmarks in the unrotated input space,
   * which is exactly the displaced-skeleton bug the first device run exhibited. Normalized
   * coordinates therefore refer to the upright image by construction.
   */
  fun detect(bitmap: Bitmap, rotationDegrees: Int): HandFrameResult {
    val upright = if (rotationDegrees == 0) {
      bitmap
    } else {
      val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
      Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }
    val timestampMs = SystemClock.uptimeMillis().coerceAtLeast(lastTimestampMs + 1)
    lastTimestampMs = timestampMs

    val startedAt = SystemClock.elapsedRealtimeNanos()
    val result = landmarker.detectForVideo(BitmapImageBuilder(upright).build(), timestampMs)
    val inferenceMs = (SystemClock.elapsedRealtimeNanos() - startedAt) / 1_000_000.0

    return mapResult(result, inferenceMs, upright.width, upright.height)
  }

  fun close() {
    landmarker.close()
  }

  private fun mapResult(result: MPResult, inferenceMs: Double, width: Int, height: Int): HandFrameResult {
    val hands = result.landmarks().mapIndexed { i, landmarks ->
      @Suppress("DEPRECATION")
      val handedness = result.handednesses().getOrNull(i)?.firstOrNull()
      HandDetection(
        landmarks = landmarks.map { HandPoint(it.x().toDouble(), it.y().toDouble(), it.z().toDouble()) }.toTypedArray(),
        handedness = handedness?.categoryName() ?: "Unknown",
        confidence = handedness?.score()?.toDouble() ?: 0.0,
      )
    }.toTypedArray()

    return HandFrameResult(
      hands = hands,
      inferenceTimeMs = inferenceMs,
      width = width.toDouble(),
      height = height.toDouble(),
    )
  }

  companion object {
    private const val MODEL_ASSET = "hand_landmarker.task"
  }
}
