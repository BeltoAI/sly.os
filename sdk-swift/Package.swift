// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SlyOS",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "SlyOS",
            targets: ["SlyOS"]
        )
    ],
    dependencies: [
        // ONNX Runtime for on-device inference
        .package(url: "https://github.com/nicklama/onnxruntime-swift-package-manager", from: "1.20.0"),
        // HuggingFace tokenizers for Swift
        .package(url: "https://github.com/huggingface/swift-transformers", from: "0.1.17"),
    ],
    targets: [
        .target(
            name: "SlyOS",
            dependencies: [
                .product(name: "onnxruntime", package: "onnxruntime-swift-package-manager"),
                .product(name: "Transformers", package: "swift-transformers"),
            ],
            path: "Sources/SlyOS"
        )
    ]
)
