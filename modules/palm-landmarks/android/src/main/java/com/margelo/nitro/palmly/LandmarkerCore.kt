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
      HandDelegate.GPU -> Delegate.GPU
      // Measured default (Decision Log 2026-07-24): on the S20+ XNNPACK CPU sustains
      // 16.6-17.8fps tracking vs 13-14.7 on the GPU delegate (whose OpenCL load falls back to
      // an ICD loader on Samsung). Spec §2.2 named GPU; empirics won.
      else -> Delegate.CPU
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
      // filter=false: 90°-multiple rotations are axis-aligned pixel moves — filtering buys
      // nothing and costs milliseconds per frame.
      Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, false)
    }
    val timestampMs = SystemClock.uptimeMillis().coerceAtLeast(lastTimestampMs + 1)
    lastTimestampMs = timestampMs

    val startedAt = SystemClock.elapsedRealtimeNanos()
    val result = landmarker.detectForVideo(BitmapImageBuilder(upright).build(), timestampMs)
    val inferenceMs = (SystemClock.elapsedRealtimeNanos() - startedAt) / 1_000_000.0

    return mapResult(result, inferenceMs, upright)
  }

  fun close() {
    landmarker.close()
  }

  private fun mapResult(result: MPResult, inferenceMs: Double, upright: Bitmap): HandFrameResult {
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
      quality = computeQuality(hands.firstOrNull(), upright),
      inferenceTimeMs = inferenceMs,
      width = upright.width.toDouble(),
      height = upright.height.toDouble(),
    )
  }

  // Exposure changes slowly — sample the luma grid every 5th frame and reuse between.
  private var lumaFrameCounter = 0
  private var cachedLuma = 0.0

  /**
   * P2.T4: the raw §2.3 guidance signals. Measurements only — thresholds/states are JS (P4.T2).
   */
  private fun computeQuality(hand: HandDetection?, upright: Bitmap): CaptureQuality {
    if (lumaFrameCounter % 5 == 0) cachedLuma = meanLuma(upright)
    lumaFrameCounter += 1
    val exposure = cachedLuma
    if (hand == null || hand.landmarks.size < 21) {
      return CaptureQuality(0.0, 0.0, 0.0, 0.0, false, 0.0, exposure)
    }
    val lm = hand.landmarks

    // Bounding box (normalized upright coords).
    val minX = lm.minOf { it.x }; val maxX = lm.maxOf { it.x }
    val minY = lm.minOf { it.y }; val maxY = lm.maxOf { it.y }
    val bboxFraction = ((maxX - minX) * (maxY - minY)).coerceIn(0.0, 1.0)
    val centerX = (minX + maxX) / 2.0
    val centerY = (minY + maxY) / 2.0

    // Palm plane from wrist(0) → index_mcp(5) / pinky_mcp(17); its normal gives tilt + facing.
    val wrist = lm[0]; val indexMcp = lm[5]; val pinkyMcp = lm[17]
    val v1x = indexMcp.x - wrist.x; val v1y = indexMcp.y - wrist.y; val v1z = indexMcp.z - wrist.z
    val v2x = pinkyMcp.x - wrist.x; val v2y = pinkyMcp.y - wrist.y; val v2z = pinkyMcp.z - wrist.z
    val nx = v1y * v2z - v1z * v2y
    val ny = v1z * v2x - v1x * v2z
    val nz = v1x * v2y - v1y * v2x
    val nLen = Math.sqrt(nx * nx + ny * ny + nz * nz)
    // 0° = palm plane parallel to the image plane; 90° = edge-on. |nz| makes it side-agnostic.
    val tiltDeg = if (nLen > 1e-9) Math.toDegrees(Math.acos((Math.abs(nz) / nLen).coerceIn(0.0, 1.0))) else 90.0
    // Winding convention (unmirrored back camera): index→pinky wraps one way per hand side.
    // Sign to be confirmed in the on-device P2.T4 test matrix; flip here if the bench disagrees.
    val palmFacing = if (hand.handedness == "Right") nz < 0 else nz > 0

    // Fingertip z-spread vs each finger's MCP, normalized by hand size (bbox diagonal).
    val handSpan = Math.sqrt((maxX - minX) * (maxX - minX) + (maxY - minY) * (maxY - minY))
    val fingers = arrayOf(4 to 2, 8 to 5, 12 to 9, 16 to 13, 20 to 17)
    val zSpread = fingers.sumOf { (tip, mcp) -> Math.abs(lm[tip].z - lm[mcp].z) } / fingers.size
    val flatness = if (handSpan > 1e-9) zSpread / handSpan else 0.0

    return CaptureQuality(bboxFraction, centerX, centerY, tiltDeg, palmFacing, flatness, exposure)
  }

  /** Mean luma [0,1] over a sparse 16×16 pixel grid — cheap per-frame exposure sample (§2.3 dark/glare). */
  private fun meanLuma(bitmap: Bitmap): Double {
    val steps = 16
    var sum = 0.0
    val sx = (bitmap.width - 1).coerceAtLeast(1)
    val sy = (bitmap.height - 1).coerceAtLeast(1)
    for (i in 0 until steps) {
      for (j in 0 until steps) {
        val px = bitmap.getPixel(sx * i / (steps - 1), sy * j / (steps - 1))
        val r = (px shr 16) and 0xFF
        val g = (px shr 8) and 0xFF
        val b = px and 0xFF
        sum += 0.299 * r + 0.587 * g + 0.114 * b
      }
    }
    return sum / (steps * steps * 255.0)
  }

  companion object {
    private const val MODEL_ASSET = "hand_landmarker.task"
  }
}
