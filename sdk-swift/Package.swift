// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SlyOS",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "SlyOS",
            targets: ["SlyOS"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "SlyOS",
            dependencies: [],
            path: "Sources/SlyOS"
        )
    ]
)
