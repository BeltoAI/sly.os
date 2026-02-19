import Foundation

// MARK: - Network Request/Response Types

/// Authentication request payload
struct AuthRequest: Codable {
    let apiKey: String
}

/// Authentication response payload
struct AuthResponse: Codable {
    let token: String
}

/// Device registration request payload
struct DeviceRegistrationRequest: Codable {
    let device_id: String
    let platform: String
    let os_version: String
    let total_memory_mb: Int
    let cpu_cores: Int
    let has_gpu: Bool
    let recommended_quant: String
    let max_context_window: Int
}

/// Telemetry event payload
struct TelemetryPayload: Codable {
    let device_id: String
    let event_type: String
    let model_id: String?
    let success: Bool
    let latency_ms: Int?
    let tokens_generated: Int?
    let error_message: String?
    let metadata: [String: AnyCodable]?

    enum CodingKeys: String, CodingKey {
        case device_id
        case event_type
        case model_id
        case success
        case latency_ms
        case tokens_generated
        case error_message
        case metadata
    }
}

/// Type-erased codable value for flexible JSON encoding
enum AnyCodable: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode(Int.self) {
            self = .int(value)
        } else if let value = try? container.decode(Double.self) {
            self = .double(value)
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .string(let value):
            try container.encode(value)
        case .int(let value):
            try container.encode(value)
        case .double(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

// MARK: - Network Client

/// HTTP client for SlyOS API communication
actor NetworkClient {
    private let apiUrl: String
    private let session: URLSession
    private var authToken: String?

    /// Initialize network client
    /// - Parameter apiUrl: Base API URL
    init(apiUrl: String) {
        self.apiUrl = apiUrl

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        config.waitsForConnectivity = true

        self.session = URLSession(configuration: config)
    }

    /// Authenticate with API key and store token
    /// - Parameter apiKey: SlyOS API key
    /// - Throws: Network or authentication errors
    func authenticate(apiKey: String) async throws {
        let endpoint = "\(apiUrl)/api/auth/sdk"
        guard let url = URL(string: endpoint) else {
            throw SlyOSError.networkError("Invalid URL: \(endpoint)")
        }

        let request = AuthRequest(apiKey: apiKey)
        let jsonData = try JSONEncoder().encode(request)

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = jsonData

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw SlyOSError.networkError("Invalid response type")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMsg = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw SlyOSError.authenticationFailed(errorMsg)
        }

        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        self.authToken = authResponse.token
    }

    /// Register device with SlyOS backend
    /// - Parameters:
    ///   - deviceId: Unique device identifier
    ///   - profile: Device profile information
    /// - Throws: Network or registration errors
    func registerDevice(deviceId: String, profile: DeviceProfile) async throws {
        guard let token = authToken else {
            throw SlyOSError.deviceNotInitialized
        }

        let endpoint = "\(apiUrl)/api/devices/register"
        guard let url = URL(string: endpoint) else {
            throw SlyOSError.networkError("Invalid URL: \(endpoint)")
        }

        let request = DeviceRegistrationRequest(
            device_id: deviceId,
            platform: profile.platform,
            os_version: profile.osVersion,
            total_memory_mb: profile.memoryMB,
            cpu_cores: profile.cpuCores,
            has_gpu: false,
            recommended_quant: profile.recommendedQuant.rawValue,
            max_context_window: profile.maxContextWindow
        )

        let jsonData = try JSONEncoder().encode(request)

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = jsonData

        let (_, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw SlyOSError.networkError("Invalid response type")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw SlyOSError.networkError("Device registration failed: \(httpResponse.statusCode)")
        }
    }

    /// Report telemetry event to SlyOS backend
    /// - Parameters:
    ///   - deviceId: Device identifier
    ///   - eventType: Type of event (e.g., "model_load", "inference")
    ///   - modelId: Model identifier (optional)
    ///   - success: Whether operation succeeded
    ///   - latencyMs: Operation latency in milliseconds (optional)
    ///   - tokensGenerated: Number of tokens generated (optional)
    ///   - errorMessage: Error message if operation failed (optional)
    func reportTelemetry(
        deviceId: String,
        eventType: String,
        modelId: String?,
        success: Bool,
        latencyMs: Int? = nil,
        tokensGenerated: Int? = nil,
        errorMessage: String? = nil
    ) async throws {
        guard let token = authToken else {
            // Telemetry is non-critical, fail silently
            return
        }

        let endpoint = "\(apiUrl)/api/telemetry"
        guard let url = URL(string: endpoint) else {
            return // Non-critical
        }

        let payload = TelemetryPayload(
            device_id: deviceId,
            event_type: eventType,
            model_id: modelId,
            success: success,
            latency_ms: latencyMs,
            tokens_generated: tokensGenerated,
            error_message: errorMessage,
            metadata: nil
        )

        let jsonData = try JSONEncoder().encode(payload)

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = jsonData

        do {
            let (_, response) = try await session.data(for: urlRequest)
            // Telemetry is best-effort, ignore failures
            _ = response as? HTTPURLResponse
        } catch {
            // Silently ignore telemetry errors
        }
    }

    /// Get current authentication token
    /// - Returns: Current auth token or nil if not authenticated
    func getToken() -> String? {
        return authToken
    }

    /// Clear authentication token
    func clearToken() {
        self.authToken = nil
    }
}

// MARK: - HTTP Helper Extension

extension URLSession {
    /// Make a generic JSON request
    /// - Parameters:
    ///   - url: Request URL
    ///   - method: HTTP method
    ///   - body: Request body (will be JSON encoded)
    ///   - headers: Additional HTTP headers
    /// - Returns: Response data
    nonisolated func jsonRequest(
        url: URL,
        method: String = "GET",
        body: Encodable? = nil,
        headers: [String: String] = [:]
    ) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw SlyOSError.networkError("Invalid response type")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw SlyOSError.networkError("HTTP \(httpResponse.statusCode)")
        }

        return data
    }
}
