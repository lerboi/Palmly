package com.margelo.nitro.palmly

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.camera.HybridCameraOutputSpec

@DoNotStrip
@Keep
class HybridHandLandmarkerFactory : HybridHandLandmarkerFactorySpec() {
  @DoNotStrip
  @Keep
  override fun createHandLandmarker(options: HandLandmarkerOptions?): HybridHandLandmarkerSpec {
    return HybridHandLandmarker(options)
  }

  @DoNotStrip
  @Keep
  override fun createHandLandmarkerOutput(options: HandLandmarkerOutputOptions): HybridCameraOutputSpec {
    return HybridHandLandmarkerOutput(options)
  }
}
