# Consumer rules for apps using SlyOS SDK

# Keep SlyOS public API
-keep public class com.slyos.SlyOS { *; }
-keep public class com.slyos.DeviceProfiler { *; }
-keep public class com.slyos.ModelRegistry { *; }

# Keep all data classes and interfaces
-keep class com.slyos.** { *; }
-keep interface com.slyos.** { *; }

# Keep enum classes
-keepclassmembers enum com.slyos.** {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Preserve serializable classes
-keepclassmembers class com.slyos.** implements kotlinx.serialization.KvmSerializable {
    public static kotlinx.serialization.KvmSerializable $serializer();
}
