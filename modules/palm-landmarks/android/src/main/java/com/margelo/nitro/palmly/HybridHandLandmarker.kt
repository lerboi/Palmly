package com.margelo.nitro.palmly

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame

/**
 * Standalone MediaPipe HandLandmarker over VisionCamera frames (Backend §2.2 / P2.T2).
 *
 * `detect()` is fully synchronous (VIDEO mode via [LandmarkerCore]), so the caller may
 * `dispose()` the frame as soon as it returns. For continuous camera analysis prefer
 * [HybridHandLandmarkerOutput] (`createHandLandmarkerOutput`), which never marshals frames to JS.
 */
class HybridHandLandmarker(options: HandLandmarkerOptions?) : HybridHandLandmarkerSpec() {
  private val context = NitroModules.applicationContext
    ?: throw Error("PalmLandmarks: no application context available!")
  private val core = LandmarkerCore(context, options)

  @OptIn(ExperimentalGetImage::class)
  override fun detect(frame: HybridFrameSpec): HandFrameResult {
    val native = frame as? NativeFrame
      ?: throw Error("PalmLandmarks: frame is not a NativeFrame!")
    val proxy = native.image
    // Copy out of the camera buffer (handles YUV_420_888 / RGBA_8888 + row strides), so the
    // caller can dispose() the frame immediately after we return.
    val bitmap = proxy.toBitmap()
    return core.detect(bitmap, proxy.imageInfo.rotationDegrees)
  }

  override fun dispose() {
    core.close()
    super.dispose()
  }
}
