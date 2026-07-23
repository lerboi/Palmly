package com.margelo.nitro.palmly

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * No JS modules — this package exists so React Native autolinking loads the library, which
 * registers the Nitro hybrid objects (PalmLandmarksOnLoad) with the shared Nitro runtime.
 */
class PalmLandmarksPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext
  ): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    HashMap()
  }

  companion object {
    init {
      PalmLandmarksOnLoad.initializeNative()
    }
  }
}
