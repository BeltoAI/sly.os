import Foundation

#if os(iOS)
import UIKit
#elseif os(macOS)
import Cocoa
#endif

#if canImport(Metal)
import Metal
#endif

// MARK: - Device Profiler

/// Handles device profiling and capability detection for iOS and macOS.
/// Detects CPU, RAM, storage, GPU (via Metal), screen, and network capabilities.
public final class DeviceProfiler: Sendable {

    /// Profile the current device with full hardware detection.
    public static func profileDevice() -> DeviceProfile {
        let cpuCores = ProcessInfo.processInfo.processorCount
        let memoryBytes = ProcessInfo.processInfo.physicalMemory
        let memoryMB = Int(memoryBytes / (1024 * 1024))

        let estimatedStorageMB = getStorageInfo()
        let (platform, osVersion) = getOSInfo()
        let gpuInfo = getGPUInfo()
        let screenInfo = getScreenInfo()

        let recommendedQuant = selectQuantization(memoryMB: memoryMB, modelId: "quantum-1.7b")
        let maxContextWindow = recommendContextWindow(memoryMB: memoryMB, quant: recommendedQuant)

        return DeviceProfile(
            cpuCores: cpuCores,
            memoryMB: memoryMB,
            estimatedStorageMB: estimatedStorageMB,
            platform: platform,
            osVersion: osVersion,
            recommendedQuant: recommendedQuant,
            maxContextWindow: maxContextWindow,
            gpuName: gpuInfo.name,
            gpuVramMB: gpuInfo.vramMB,
            screenWidth: screenInfo.width,
            screenHeight: screenInfo.height,
            pixelRatio: screenInfo.pixelRatio
        )
    }

    // MARK: - Storage Info

    private static func getStorageInfo() -> Int {
        #if os(iOS) || os(macOS)
        do {
            let fileManager = FileManager.default
            let paths = fileManager.urls(for: .documentDirectory, in: .userDomainMask)

            if let url = paths.last {
                let attributes = try fileManager.attributesOfFileSystem(forPath: url.path)
                if let freeSpace = attributes[.systemFreeSize] as? NSNumber {
                    return Int(freeSpace.int64Value / (1024 * 1024))
                }
            }
        } catch {
            // Fallback
        }
        #endif
        return 5000
    }

    // MARK: - OS Info

    private static func getOSInfo() -> (platform: String, osVersion: String) {
        #if os(iOS)
        let device = UIDevice.current
        let platform = "iOS"
        let osVersion = "\(device.systemVersion) (\(device.model))"
        return (platform, osVersion)
        #elseif os(macOS)
        let platform = "macOS"
        let version = ProcessInfo.processInfo.operatingSystemVersion
        let osVersion = "\(version.majorVersion).\(version.minorVersion).\(version.patchVersion)"
        return (platform, osVersion)
        #else
        return ("Unknown", "Unknown")
        #endif
    }

    // MARK: - GPU Detection via Metal

    private static func getGPUInfo() -> (name: String?, vramMB: Int) {
        #if canImport(Metal)
        guard let device = MTLCreateSystemDefaultDevice() else {
            return (nil, 0)
        }

        let name = device.name

        // Estimate VRAM from GPU name
        var vramMB = 0
        if name.contains("M4") {
            vramMB = 16384
        } else if name.contains("M3") {
            vramMB = 12288
        } else if name.contains("M2") {
            vramMB = 8192
        } else if name.contains("M1") {
            vramMB = 8192
        } else if name.contains("A17") || name.contains("A16") {
            vramMB = 6144
        } else if name.contains("A15") || name.contains("A14") {
            vramMB = 4096
        } else if name.contains("A13") || name.contains("A12") {
            vramMB = 3072
        } else {
            // Generic Metal device — estimate based on system RAM
            let systemRAM = Int(ProcessInfo.processInfo.physicalMemory / (1024 * 1024))
            vramMB = systemRAM / 2 // Unified memory: GPU shares system RAM
        }

        return (name, vramMB)
        #else
        return (nil, 0)
        #endif
    }

    // MARK: - Screen Detection

    private static func getScreenInfo() -> (width: Int, height: Int, pixelRatio: Float) {
        #if os(iOS)
        let screen = UIScreen.main
        let bounds = screen.bounds
        let scale = screen.scale
        return (
            width: Int(bounds.width * scale),
            height: Int(bounds.height * scale),
            pixelRatio: Float(scale)
        )
        #elseif os(macOS)
        if let screen = NSScreen.main {
            let frame = screen.frame
            let scale = screen.backingScaleFactor
            return (
                width: Int(frame.width * scale),
                height: Int(frame.height * scale),
                pixelRatio: Float(scale)
            )
        }
        return (width: 0, height: 0, pixelRatio: 1.0)
        #else
        return (width: 0, height: 0, pixelRatio: 1.0)
        #endif
    }
}

// MARK: - Quantization Selection

public func selectQuantization(memoryMB: Int, modelId: String) -> QuantizationLevel {
    guard let info = modelRegistry[modelId] else {
        return .q4
    }

    // For LLM models, cap at Q4 for ONNX stability
    if info.category == .llm {
        return .q4
    }

    // For STT models, try higher quality
    let quantLevels: [QuantizationLevel] = [.fp16, .q8, .q4]
    for quantLevel in quantLevels {
        if memoryMB >= info.minRAM_MB[quantLevel, default: Int.max] {
            return quantLevel
        }
    }

    return .q4
}

public func recommendContextWindow(memoryMB: Int, quant: QuantizationLevel) -> Int {
    let base = switch quant {
    case .q4: 1024
    case .q8: 2048
    case .fp16: 4096
    case .fp32: 8192
    }

    if memoryMB >= 16384 { return min(base * 4, 32768) }
    if memoryMB >= 8192 { return min(base * 2, 16384) }
    if memoryMB >= 4096 { return base }
    return max(512, base / 2)
}

// MARK: - Model Capability Checking

public struct ModelCompatibilityCheck: Sendable {
    public let canRun: Bool
    public let reason: String
    public let recommendedQuant: QuantizationLevel
}

public func checkModelCompatibility(
    modelId: String,
    quantization: QuantizationLevel? = nil,
    deviceProfile: DeviceProfile
) -> ModelCompatibilityCheck {
    guard let info = modelRegistry[modelId] else {
        return ModelCompatibilityCheck(canRun: false, reason: "Unknown model '\(modelId)'", recommendedQuant: .q4)
    }

    let memoryMB = deviceProfile.memoryMB
    let bestQuant = selectQuantization(memoryMB: memoryMB, modelId: modelId)

    if let requestedQuant = quantization {
        if memoryMB < info.minRAM_MB[requestedQuant, default: Int.max] {
            let needed = info.minRAM_MB[requestedQuant, default: 0]
            return ModelCompatibilityCheck(
                canRun: false,
                reason: "Insufficient RAM for \(requestedQuant.rawValue.uppercased()). Need \(needed)MB, have \(memoryMB)MB.",
                recommendedQuant: bestQuant
            )
        }
    }

    if memoryMB < info.minRAM_MB[.q4, default: Int.max] {
        let needed = info.minRAM_MB[.q4, default: 0]
        return ModelCompatibilityCheck(
            canRun: false,
            reason: "Model requires at least \(needed)MB RAM even at Q4. Device has \(memoryMB)MB.",
            recommendedQuant: .q4
        )
    }

    let quantStr = quantization?.rawValue.uppercased() ?? "AUTO"
    return ModelCompatibilityCheck(
        canRun: true,
        reason: "Device can run this model at \(quantStr) precision",
        recommendedQuant: bestQuant
    )
}

// MARK: - Model Recommendation Engine

/// Internal function to avoid name collision with SlyOS.recommendModel
func SlyOS_recommendModel(
    category: ModelCategory = .llm,
    deviceProfile: DeviceProfile
) -> ModelRecommendation? {
    let memoryMB = deviceProfile.memoryMB
    let candidates = modelRegistry.filter { $0.value.category == category }
    let sorted = candidates.sorted { a, b in
        b.value.sizesMB[.q4, default: 0] > a.value.sizesMB[.q4, default: 0]
    }

    for (modelId, info) in sorted {
        let quant = selectQuantization(memoryMB: memoryMB, modelId: modelId)
        if memoryMB >= info.minRAM_MB[quant, default: Int.max] {
            let contextWindow = recommendContextWindow(memoryMB: memoryMB, quant: quant)
            return ModelRecommendation(
                modelId: modelId,
                quantizationLevel: quant,
                contextWindow: contextWindow,
                reason: "Recommended for \(memoryMB)MB RAM at \(quant.rawValue.uppercased()) precision"
            )
        }
    }

    if let smallest = sorted.last {
        return ModelRecommendation(
            modelId: smallest.key,
            quantizationLevel: .q4,
            contextWindow: recommendContextWindow(memoryMB: memoryMB, quant: .q4),
            reason: "Limited device memory - using smallest available model"
        )
    }

    return nil
}
