package com.margelo.nitro.palmly

import android.util.Size
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.CameraOrientation
import com.margelo.nitro.camera.HybridCameraOutputSpec
import com.margelo.nitro.camera.MediaType
import com.margelo.nitro.camera.MirrorMode
import com.margelo.nitro.camera.extensions.converters.toSize
import com.margelo.nitro.camera.extensions.surfaceRotation
import com.margelo.nitro.camera.public.NativeCameraOutput
import java.util.concurrent.Executors

/**
 * A VisionCamera V5 `CameraOutput` that runs the MediaPipe HandLandmarker on every camera frame
 * natively (P2.T2, Backend §2.2) — modeled on `react-native-vision-camera-face-detector`'s
 * output, the field-proven V5 plugin shape. Frames never cross into JS: the analyzer runs
 * detection synchronously on its own single-thread executor (VIDEO mode), closes the ImageProxy,
 * and only the landmark result struct is delivered to JS via `onHands`.
 *
 * Backpressure is `KEEP_ONLY_LATEST`: frames arriving while detection is busy are dropped by
 * CameraX, so the `onHands` rate ≈ the landmarker's true sustained fps (the P2.T2 metric).
 */
class HybridHandLandmarkerOutput(
  private val options: HandLandmarkerOutputOptions,
) : HybridCameraOutputSpec(),
  ImageAnalysis.Analyzer,
  NativeCameraOutput {
  override val mediaType: MediaType = MediaType.VIDEO
  override val mirrorMode: MirrorMode = MirrorMode.AUTO
  override var outputOrientation: CameraOrientation = CameraOrientation.UP
    set(value) {
      field = value
      imageAnalysis?.targetRotation = value.surfaceRotation
    }
  override val currentResolution: com.margelo.nitro.camera.Size?
    get() = imageAnalysis?.resolutionInfo?.resolution?.toSize()

  private val context = NitroModules.applicationContext
    ?: throw Error("PalmLandmarks: no application context available!")
  private val core = LandmarkerCore(
    context,
    HandLandmarkerOptions(
      numHands = options.numHands,
      minHandDetectionConfidence = options.minHandDetectionConfidence,
      minHandPresenceConfidence = options.minHandPresenceConfidence,
      minTrackingConfidence = options.minTrackingConfidence,
      delegate = options.delegate,
    ),
  )
  private val executor = Executors.newSingleThreadExecutor()
  private var imageAnalysis: ImageAnalysis? = null

  override fun createUseCase(
    mirrorMode: MirrorMode,
    config: NativeCameraOutput.Config,
  ): NativeCameraOutput.PreparedUseCase {
    val resolutionSelector = ResolutionSelector.Builder()
      .setResolutionStrategy(
        ResolutionStrategy(TARGET_RESOLUTION, ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER),
      )
      .build()
    val imageAnalysis = ImageAnalysis.Builder()
      .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
      .setOutputImageRotationEnabled(false)
      .setResolutionSelector(resolutionSelector)
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
    return NativeCameraOutput.PreparedUseCase(imageAnalysis) {
      this.imageAnalysis = imageAnalysis
      imageAnalysis.setAnalyzer(executor, this)
    }
  }

  override fun analyze(imageProxy: ImageProxy) {
    try {
      // Copy out of the camera buffer (handles YUV row strides); sync detect; only the result
      // struct crosses to JS.
      val bitmap = imageProxy.toBitmap()
      val rotation = imageProxy.imageInfo.rotationDegrees
      val result = core.detect(bitmap, rotation)
      options.onHands(result)
    } catch (t: Throwable) {
      options.onError(t.message ?: "PalmLandmarks: failed to analyze frame")
    } finally {
      imageProxy.close()
    }
  }

  override fun dispose() {
    imageAnalysis?.clearAnalyzer()
    executor.shutdown()
    core.close()
    super.dispose()
  }

  companion object {
    /** 720p-class input is the MediaPipe-recommended live resolution (matches the face-detector). */
    private val TARGET_RESOLUTION = Size(1280, 720)
  }
}
