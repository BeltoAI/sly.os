import Foundation

#if os(iOS)
import UIKit
#elseif os(macOS)
import Cocoa
#endif

// MARK: - Device Profiler

/// Handles device profiling and capability detection
public final class DeviceProfiler: Sendable {
    /// Profile the current device
    public static func profileDevice() async -> DeviceProfile {
        let cpuCores = ProcessInfo.processInfo.processorCount
        let memoryBytes = ProcessInfo.processInfo.physicalMemory
        let memoryMB = Int(memoryBytes / (1024 * 1024))

        let estimatedStorageMB = await getStorageInfo()
        let (platform, osVersion) = getOSInfo()

        let recommendedQuant = selectQuantization(memoryMB: memoryMB, modelId: "quantum-1.7b")
        let maxContextWindow = recommendContextWindow(memoryMB: memoryMB, quant: recommendedQuant)

        return DeviceProfile(
            cpuCores: cpuCores,
            memoryMB: memoryMB,
            estimatedStorageMB: estimatedStorageMB,
            platform: platform,
            osVersion: osVersion,
            recommendedQuant: recommendedQuant,
            maxContextWindow: maxContextWindow
        )
    }

    /// Get device storage information
    private static func getStorageInfo() async -> Int {
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
            // Fallback to conservative estimate
        }
        #endif

        return 5000 // Conservative default: 5GB
    }

    /// Get platform and OS version information
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
}

// MARK: - Quantization Selection

/// Select appropriate quantization level based on available RAM
/// - Parameters:
///   - memoryMB: Total available RAM in MB
///   - modelId: Model identifier to check requirements
/// - Returns: Recommended QuantizationLevel
public func selectQuantization(memoryMB: Int, modelId: String) -> QuantizationLevel {
    guard let info = modelRegistry[modelId] else {
        return .q4
    }

    // For LLM models, cap at Q4 for safety with ONNX/Core ML
    if info.category == .llm {
        return .q4
    }

    // For STT models, try higher quality quantizations
    let quantLevels: [QuantizationLevel] = [.fp16, .q8, .q4]
    for quantLevel in quantLevels {
        if memoryMB >= info.minRAM_MB[quantLevel, default: Int.max] {
            return quantLevel
        }
    }

    return .q4 // Fallback
}

/// Determine appropriate context window size based on device RAM and quantization
/// - Parameters:
///   - memoryMB: Total available RAM in MB
///   - quant: Quantization level being used
/// - Returns: Maximum recommended context window in tokens
public func recommendContextWindow(memoryMB: Int, quant: QuantizationLevel) -> Int {
    // Base context size depends on quantization
    let base = switch quant {
    case .q4: 1024
    case .q8: 2048
    case .fp16: 4096
    case .fp32: 8192
    }

    // Scale based on available RAM
    if memoryMB >= 16384 {
        return min(base * 4, 32768)
    } else if memoryMB >= 8192 {
        return min(base * 2, 16384)
    } else if memoryMB >= 4096 {
        return base
    } else {
        return max(512, base / 2)
    }
}

// MARK: - Model Capability Checking

/// Result of checking if a device can run a specific model
public struct ModelCompatibilityCheck: Sendable {
    /// Whether the device can run this model configuration
    public let canRun: Bool

    /// Explanation of the check result
    public let reason: String

    /// Recommended quantization if the requested one isn't available
    public let recommendedQuant: QuantizationLevel
}

/// Check if device can run a specific model with given quantization
/// - Parameters:
///   - modelId: Model identifier
///   - quantization: Requested quantization level (nil for auto-select)
///   - deviceProfile: Device profile with capabilities
/// - Returns: ModelCompatibilityCheck with result and recommendation
public func checkModelCompatibility(
    modelId: String,
    quantization: QuantizationLevel? = nil,
    deviceProfile: DeviceProfile
) -> ModelCompatibilityCheck {
    guard let info = modelRegistry[modelId] else {
        return ModelCompatibilityCheck(
            canRun: false,
            reason: "Unknown model '\(modelId)'",
            recommendedQuant: .q4
        )
    }

    let memoryMB = deviceProfile.memoryMB
    let bestQuant = selectQuantization(memoryMB: memoryMB, modelId: modelId)

    // If specific quantization requested, check if feasible
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

    // Check if even Q4 is feasible
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

/// Recommend best model based on device capabilities
/// - Parameters:
///   - category: Model category to filter (LLM or STT)
///   - deviceProfile: Device profile with capabilities
/// - Returns: ModelRecommendation or nil if no suitable model found
public func recommendModel(
    category: ModelCategory = .llm,
    deviceProfile: DeviceProfile
) -> ModelRecommendation? {
    let memoryMB = deviceProfile.memoryMB

    // Filter models by category
    let candidates = modelRegistry.filter { $0.value.category == category }

    // Sort by model size descending - pick largest that fits
    let sorted = candidates.sorted { a, b in
        b.value.sizesMB[.q4, default: 0] > a.value.sizesMB[.q4, default: 0]
    }

    for (modelId, info) in sorted {
        let quant = selectQuantization(memoryMB: memoryMB, modelId: modelId)

        if memoryMB >= info.minRAM_MB[quant, default: Int.max] {
            let contextWindow = recommendContextWindow(memoryMB: memoryMB, quant: quant)
            let reason = "Recommended for \(memoryMB)MB RAM at \(quant.rawValue.uppercased()) precision"

            return ModelRecommendation(
                modelId: modelId,
                quantizationLevel: quant,
                contextWindow: contextWindow,
                reason: reason
            )
        }
    }

    // Fallback to smallest model if nothing else fits
    if let smallest = sorted.last {
        let contextWindow = recommendContextWindow(memoryMB: memoryMB, quant: .q4)
        let reason = "Limited device memory - using smallest available model"

        return ModelRecommendation(
            modelId: smallest.key,
            quantizationLevel: .q4,
            contextWindow: contextWindow,
            reason: reason
        )
    }

    return nil
}

// MARK: - Available Models Listing

/// Get all available models grouped by category
/// - Returns: Dictionary mapping category names to lists of ModelInfo
public func getAvailableModels() -> [String: [ModelInfo]] {
    var grouped: [String: [ModelInfo]] = [
        "llm": [],
        "stt": []
    ]

    for (id, info) in modelRegistry {
        let categoryKey = info.category.rawValue
        if grouped[categoryKey] == nil {
            grouped[categoryKey] = []
        }
        grouped[categoryKey]?.append(info)
    }

    return grouped
}
