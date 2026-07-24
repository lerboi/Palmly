package com.margelo.nitro.palmly

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.BitmapFactory
import androidx.exifinterface.media.ExifInterface
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker.HandLandmarkerOptions as MPOptions
import java.io.File
import java.io.FileOutputStream

/**
 * The cv1 canonicalization pipeline (P4.T3; Backend §6.2 + §6.6 item 2): turns a captured/picked
 * photo into the pipeline's pinned extraction input. EVERY parameter here is part of the
 * `extractor_version` contract — changing any of them is a cv2, never an in-place edit, because
 * repeat-scan consistency (§6.6) assumes canonical inputs are stable across app sessions.
 *
 * Palm: EXIF-upright decode → IMAGE-mode HandLandmarker on the still (stateless, unlike the live
 * VIDEO-mode tracker) → similarity warp (rotate/scale/translate, no shear — 2-point
 * `setPolyToPoly`) anchoring wrist(0)→(768,1330) and middle-MCP(9)→(768,770) → 1536×1536 →
 * deterministic CLAHE → JPEG q85. The anchors sit on the rigid palm (fingertips are
 * curl-unstable), and the framing fits a full hand: palm height 560px leaves headroom for the
 * middle finger (~1.05× palm height above the MCP) and the wrist creases below.
 *
 * Region (face, P4.T5): same decode/CLAHE/encode legs around a plain centered square crop — the
 * region itself comes from the live detector at shutter time, so no still re-detection.
 */
internal object Canonicalizer {
  /** The client component of `extractor_version` (server composes `{cv}+{model}+{prompt}`). */
  const val CV_VERSION = "cv1"

  private const val SIZE = 1536
  private const val JPEG_QUALITY = 85
  private const val ANCHOR_X = SIZE / 2f
  private const val WRIST_Y = 1330f
  private const val MCP_Y = 770f
  private const val CLAHE_TILES = 8
  private const val CLAHE_CLIP = 2.0

  // One IMAGE-mode landmarker for stills, shared and synchronized (creation loads the model).
  // CPU delegate: same rationale as the live tracker (P2 Decision Log), and one-shot latency is
  // irrelevant next to the capture UX.
  private var still: HandLandmarker? = null
  private val stillLock = Any()
  private fun stillLandmarker(context: Context): HandLandmarker = synchronized(stillLock) {
    still ?: HandLandmarker.createFromOptions(
      context,
      MPOptions.builder()
        .setBaseOptions(BaseOptions.builder().setModelAssetPath("hand_landmarker.task").setDelegate(Delegate.CPU).build())
        .setRunningMode(RunningMode.IMAGE)
        .setNumHands(1)
        .setMinHandDetectionConfidence(0.5f)
        .build(),
    ).also { still = it }
  }

  fun canonicalizePalm(context: Context, filePath: String): CanonicalPalm {
    val upright = decodeUpright(filePath)
    val result = synchronized(stillLock) {
      stillLandmarker(context).detect(BitmapImageBuilder(upright).build())
    }
    val landmarks = result.landmarks().firstOrNull()
      ?: throw Error("no hand detected in still image")
    @Suppress("DEPRECATION")
    val handedness = result.handednesses().firstOrNull()?.firstOrNull()

    val w = upright.width.toFloat()
    val h = upright.height.toFloat()
    val wrist = landmarks[0]
    val mcp = landmarks[9]

    // Similarity transform from the two palm anchors (2-point setPolyToPoly = rotate/scale/
    // translate only — no shear/perspective to amplify landmark-z noise).
    val matrix = Matrix()
    val ok = matrix.setPolyToPoly(
      floatArrayOf(wrist.x() * w, wrist.y() * h, mcp.x() * w, mcp.y() * h), 0,
      floatArrayOf(ANCHOR_X, WRIST_Y, ANCHOR_X, MCP_Y), 0,
      2,
    )
    if (!ok) throw Error("degenerate palm anchors (wrist == middle MCP)")

    val out = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    canvas.drawColor(Color.BLACK)
    canvas.drawBitmap(upright, matrix, Paint(Paint.FILTER_BITMAP_FLAG))

    clahe(out)

    // Re-project the 21 landmarks into the canonical frame (normalized) for overlays/telemetry.
    val pts = FloatArray(42)
    landmarks.forEachIndexed { i, lm ->
      pts[2 * i] = lm.x() * w
      pts[2 * i + 1] = lm.y() * h
    }
    matrix.mapPoints(pts)
    val canonicalLandmarks = Array(21) { i ->
      HandPoint(pts[2 * i].toDouble() / SIZE, pts[2 * i + 1].toDouble() / SIZE, landmarks[i].z().toDouble())
    }

    return CanonicalPalm(
      filePath = save(context, out),
      landmarks = canonicalLandmarks,
      handedness = handedness?.categoryName() ?: "Unknown",
      confidence = handedness?.score()?.toDouble() ?: 0.0,
    )
  }

  fun canonicalizeRegion(context: Context, filePath: String, centerX: Double, centerY: Double, sizeFraction: Double): String {
    val upright = decodeUpright(filePath)
    val w = upright.width
    val h = upright.height
    val side = (sizeFraction.coerceIn(0.05, 1.0) * minOf(w, h)).toInt().coerceAtLeast(64)
    val left = ((centerX * w) - side / 2.0).toInt().coerceIn(0, w - side)
    val top = ((centerY * h) - side / 2.0).toInt().coerceIn(0, h - side)

    val out = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
    Canvas(out).drawBitmap(
      upright,
      Rect(left, top, left + side, top + side),
      Rect(0, 0, SIZE, SIZE),
      Paint(Paint.FILTER_BITMAP_FLAG),
    )
    clahe(out)
    return save(context, out)
  }

  /** Decode a file honoring its EXIF orientation (camera stills are stored sensor-native). */
  private fun decodeUpright(filePath: String): Bitmap {
    val decoded = BitmapFactory.decodeFile(filePath) ?: throw Error("could not decode image: $filePath")
    val exif = ExifInterface(filePath)
    val rotation = exif.rotationDegrees
    val flipped = exif.isFlipped
    if (rotation == 0 && !flipped) return decoded
    val m = Matrix().apply {
      if (flipped) postScale(-1f, 1f)
      if (rotation != 0) postRotate(rotation.toFloat())
    }
    return Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, m, false)
  }

  /**
   * In-place CLAHE on the luma channel — pinned cv1 params: 8×8 tiles (192px at 1536), clip 2.0,
   * 256 bins, integer BT.601 luma, borders replicated, bilinear LUT interpolation. All-integer
   * math except the interpolation weights, so the result is bit-stable for identical input (the
   * on-device determinism bench hashes two runs to prove it).
   */
  private fun clahe(bitmap: Bitmap) {
    val size = bitmap.width // SIZE×SIZE by construction
    val px = IntArray(size * size)
    bitmap.getPixels(px, 0, size, 0, 0, size, size)

    val luma = IntArray(size * size)
    for (i in px.indices) {
      val p = px[i]
      luma[i] = (299 * ((p shr 16) and 0xFF) + 587 * ((p shr 8) and 0xFF) + 114 * (p and 0xFF)) / 1000
    }

    val tile = size / CLAHE_TILES
    val tilePixels = tile * tile
    val clip = (CLAHE_CLIP * tilePixels / 256.0).toInt()
    // Per-tile equalization LUTs (clipped histogram, excess redistributed deterministically).
    val luts = Array(CLAHE_TILES * CLAHE_TILES) { t ->
      val ty = t / CLAHE_TILES
      val tx = t % CLAHE_TILES
      val hist = IntArray(256)
      val y0 = ty * tile
      val x0 = tx * tile
      for (y in y0 until y0 + tile) {
        val row = y * size
        for (x in x0 until x0 + tile) hist[luma[row + x]] += 1
      }
      var excess = 0
      for (b in 0 until 256) {
        if (hist[b] > clip) {
          excess += hist[b] - clip
          hist[b] = clip
        }
      }
      val bonus = excess / 256
      val rem = excess % 256
      for (b in 0 until 256) hist[b] += bonus + if (b < rem) 1 else 0
      val lut = IntArray(256)
      var cum = 0
      for (b in 0 until 256) {
        cum += hist[b]
        lut[b] = ((cum * 255 + tilePixels / 2) / tilePixels).coerceIn(0, 255)
      }
      lut
    }

    // Bilinear interpolation between the four surrounding tile LUTs, borders replicated.
    val half = tile / 2f
    for (y in 0 until size) {
      val fy = (y - half) / tile
      val ty0 = fy.toInt().coerceIn(0, CLAHE_TILES - 1).let { if (fy < 0) 0 else it }
      val ty1 = (ty0 + 1).coerceAtMost(CLAHE_TILES - 1)
      val wy = (fy - ty0).coerceIn(0f, 1f)
      val row = y * size
      for (x in 0 until size) {
        val fx = (x - half) / tile
        val tx0 = fx.toInt().coerceIn(0, CLAHE_TILES - 1).let { if (fx < 0) 0 else it }
        val tx1 = (tx0 + 1).coerceAtMost(CLAHE_TILES - 1)
        val wx = (fx - tx0).coerceIn(0f, 1f)
        val v = luma[row + x]
        val top = luts[ty0 * CLAHE_TILES + tx0][v] * (1 - wx) + luts[ty0 * CLAHE_TILES + tx1][v] * wx
        val bot = luts[ty1 * CLAHE_TILES + tx0][v] * (1 - wx) + luts[ty1 * CLAHE_TILES + tx1][v] * wx
        val newY = (top * (1 - wy) + bot * wy + 0.5f).toInt().coerceIn(0, 255)
        if (v > 0 && newY != v) {
          val p = px[row + x]
          val r = ((((p shr 16) and 0xFF) * newY + v / 2) / v).coerceAtMost(255)
          val g = ((((p shr 8) and 0xFF) * newY + v / 2) / v).coerceAtMost(255)
          val b = (((p and 0xFF) * newY + v / 2) / v).coerceAtMost(255)
          px[row + x] = (p and 0xFF000000.toInt()) or (r shl 16) or (g shl 8) or b
        }
      }
    }
    bitmap.setPixels(px, 0, size, 0, 0, size, size)
  }

  private fun save(context: Context, bitmap: Bitmap): String {
    val file = File.createTempFile("canonical-", ".jpg", context.cacheDir)
    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, it) }
    return file.absolutePath
  }
}
