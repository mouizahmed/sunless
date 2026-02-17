// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SunlessAudioCapture",
    platforms: [
        .macOS(.v14)
    ],
    targets: [
        .executableTarget(
            name: "SunlessAudioCapture",
            path: "Sources",
            linkerSettings: [
                .linkedFramework("CoreAudio"),
                .linkedFramework("AudioToolbox"),
                .linkedFramework("AVFoundation"),
            ]
        ),
    ]
)
