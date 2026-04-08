import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

enum Profile: String {
    case conservative
    case balanced
    case aggressive
    case objectSafe
}

struct Pixel {
    var r: UInt8
    var g: UInt8
    var b: UInt8
    var a: UInt8
}

func isBackgroundCandidate(_ pixel: Pixel, profile: Profile) -> Bool {
    let r = Int(pixel.r)
    let g = Int(pixel.g)
    let b = Int(pixel.b)
    let maxC = max(r, g, b)
    let minC = min(r, g, b)
    let avg = (r + g + b) / 3
    let chroma = maxC - minC
    switch profile {
    case .conservative:
        return pixel.a > 0 && avg > 228 && maxC > 238 && chroma < 26
    case .balanced:
        return pixel.a > 0 && avg > 208 && maxC > 220 && chroma < 42
    case .aggressive:
        return pixel.a > 0 && avg > 196 && maxC > 214 && chroma < 54
    case .objectSafe:
        return pixel.a > 0 && avg > 214 && maxC > 228 && chroma < 34
    }
}

func loadPixels(from inputURL: URL) throws -> (pixels: [Pixel], width: Int, height: Int) {
    guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "remove_light_bg", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to load image"])
    }

    let width = image.width
    let height = image.height
    let bytesPerPixel = 4
    let bytesPerRow = width * bytesPerPixel
    let bitsPerComponent = 8

    var raw = [UInt8](repeating: 0, count: height * bytesPerRow)

    guard let ctx = CGContext(
        data: &raw,
        width: width,
        height: height,
        bitsPerComponent: bitsPerComponent,
        bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw NSError(domain: "remove_light_bg", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unable to create bitmap context"])
    }

    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

    let pixels: [Pixel] = stride(from: 0, to: raw.count, by: 4).map { i in
        Pixel(r: raw[i], g: raw[i + 1], b: raw[i + 2], a: raw[i + 3])
    }

    return (pixels, width, height)
}

func floodFillBackground(_ pixels: [Pixel], width: Int, height: Int, profile: Profile) -> Set<Int> {
    var visited = Set<Int>()
    var queue = [Int]()

    func enqueue(_ index: Int) {
        if visited.contains(index) { return }
        if !isBackgroundCandidate(pixels[index], profile: profile) { return }
        visited.insert(index)
        queue.append(index)
    }

    for x in 0..<width {
        enqueue(x)
        enqueue((height - 1) * width + x)
    }

    for y in 0..<height {
        enqueue(y * width)
        enqueue(y * width + (width - 1))
    }

    var cursor = 0
    while cursor < queue.count {
        let index = queue[cursor]
        cursor += 1

        let x = index % width
        let y = index / width

        if x > 0 { enqueue(index - 1) }
        if x < width - 1 { enqueue(index + 1) }
        if y > 0 { enqueue(index - width) }
        if y < height - 1 { enqueue(index + width) }
    }

    return visited
}

func makeOutputPixels(_ pixels: [Pixel], background: Set<Int>, profile: Profile) -> [UInt8] {
    var output = [UInt8]()
    output.reserveCapacity(pixels.count * 4)

    for (index, pixel) in pixels.enumerated() {
        let r = Int(pixel.r)
        let g = Int(pixel.g)
        let b = Int(pixel.b)
        let avg = (r + g + b) / 3
        let chroma = max(r, g, b) - min(r, g, b)

        var alpha = Int(pixel.a)
        if background.contains(index) {
            alpha = 0
        } else {
            switch profile {
            case .conservative:
                if avg > 238 && chroma < 20 {
                    alpha = max(180, Int(Double(alpha) * 0.88))
                }
            case .balanced:
                if avg > 215 && chroma < 36 {
                    alpha = max(110, Int(Double(alpha) * 0.72))
                }
            case .aggressive:
                if avg > 182 && chroma < 56 {
                    let softness = min(1.0, max(0.0, Double(avg - 182) / 73.0))
                    let reduction = 0.35 + softness * 0.55
                    alpha = Int(Double(alpha) * (1.0 - reduction))
                }
            case .objectSafe:
                // Preserve bright specular highlights on the object; only soften near-white matte residue.
                if avg > 240 && chroma < 18 {
                    alpha = max(210, Int(Double(alpha) * 0.92))
                } else if avg > 225 && chroma < 28 {
                    alpha = max(235, Int(Double(alpha) * 0.98))
                }
            }
        }

        output.append(pixel.r)
        output.append(pixel.g)
        output.append(pixel.b)
        output.append(UInt8(max(0, min(255, alpha))))
    }

    return output
}

func writePNG(_ raw: [UInt8], width: Int, height: Int, outputURL: URL) throws {
    let bytesPerPixel = 4
    let bytesPerRow = width * bytesPerPixel
    let bitsPerComponent = 8

    let provider = CGDataProvider(data: Data(raw) as CFData)!
    guard let image = CGImage(
        width: width,
        height: height,
        bitsPerComponent: bitsPerComponent,
        bitsPerPixel: bitsPerComponent * bytesPerPixel,
        bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
        provider: provider,
        decode: nil,
        shouldInterpolate: true,
        intent: .defaultIntent
    ) else {
        throw NSError(domain: "remove_light_bg", code: 3, userInfo: [NSLocalizedDescriptionKey: "Unable to create output image"])
    }

    guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        throw NSError(domain: "remove_light_bg", code: 4, userInfo: [NSLocalizedDescriptionKey: "Unable to create destination"])
    }

    CGImageDestinationAddImage(destination, image, nil)
    if !CGImageDestinationFinalize(destination) {
        throw NSError(domain: "remove_light_bg", code: 5, userInfo: [NSLocalizedDescriptionKey: "Unable to finalize destination"])
    }
}

let args = CommandLine.arguments.dropFirst()
guard !args.isEmpty else {
    fputs("Usage: swift remove_light_bg.swift <image-path> [<image-path>...]\n", stderr)
    exit(1)
}

var profile: Profile = .balanced
var files: [String] = []

for arg in args {
    if arg.hasPrefix("--profile=") {
        let value = String(arg.dropFirst("--profile=".count))
        guard let parsed = Profile(rawValue: value) else {
            fputs("Invalid profile: \(value)\n", stderr)
            exit(1)
        }
        profile = parsed
    } else {
        files.append(String(arg))
    }
}

guard !files.isEmpty else {
    fputs("No input files provided.\n", stderr)
    exit(1)
}

for arg in files {
    let inputURL = URL(fileURLWithPath: arg)
    let outputFile = inputURL.deletingPathExtension().lastPathComponent + "-cutout.png"
    let finalURL = inputURL.deletingLastPathComponent().appendingPathComponent(outputFile)

    do {
        let loaded = try loadPixels(from: inputURL)
        let background = floodFillBackground(loaded.pixels, width: loaded.width, height: loaded.height, profile: profile)
        let output = makeOutputPixels(loaded.pixels, background: background, profile: profile)
        try writePNG(output, width: loaded.width, height: loaded.height, outputURL: finalURL)
        print("Created \(finalURL.path) with profile \(profile.rawValue)")
    } catch {
        fputs("Failed for \(arg): \(error.localizedDescription)\n", stderr)
        exit(2)
    }
}
