package com.margelo.nitro.palmly

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.HybridCameraOutputSpec
import com.margelo.nitro.core.Promise

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

  // Both canonicalize legs are CPU-bound bitmap work — Promise.parallel runs them off the JS/UI
  // threads and rejects the JS promise on throw (the raw-upload fallback path).
  @DoNotStrip
  @Keep
  override fun canonicalizePalm(filePath: String): Promise<CanonicalPalm> = Promise.parallel {
    val context = NitroModules.applicationContext
      ?: throw Error("PalmLandmarks: no application context available!")
    Canonicalizer.canonicalizePalm(context, filePath)
  }

  @DoNotStrip
  @Keep
  override fun canonicalizeRegion(filePath: String, centerX: Double, centerY: Double, sizeFraction: Double): Promise<String> =
    Promise.parallel {
      val context = NitroModules.applicationContext
        ?: throw Error("PalmLandmarks: no application context available!")
      Canonicalizer.canonicalizeRegion(context, filePath, centerX, centerY, sizeFraction)
    }
}
