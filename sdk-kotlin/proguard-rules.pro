# SlyOS SDK ProGuard Rules

# Keep SlyOS classes
-keep class com.slyos.** { *; }
-keepnames class com.slyos.**

# Keep data classes and serialization
-keepclassmembers class com.slyos.** {
    public <init>(...);
    public ** get*();
    public ** set*();
}

# Keep serialization-related classes
-keep class kotlinx.serialization.** { *; }
-keep class kotlin.reflect.** { *; }
-keepattributes *Annotation*
-keepattributes Signature

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ONNX Runtime
-keep class ai.onnxruntime.** { *; }
-keep interface ai.onnxruntime.** { *; }

# Kotlin coroutines
-keep class kotlinx.coroutines.** { *; }
-keep class kotlin.coroutines.** { *; }

# Android specific
-keep class android.** { *; }
-dontwarn android.**

# Enums
-keepclassmembers enum com.slyos.** {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Callback interfaces
-keep interface com.slyos.** { *; }

# Keep line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
