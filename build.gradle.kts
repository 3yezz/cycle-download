// Top-level build file where you can add configuration options common to all sub-projects/modules.
// build.gradle.kts (Project level)
plugins {
    alias(libs.plugins.android.application) apply false
    // AJOUTE CETTE LIGNE ICI avec la version
    id("com.google.gms.google-services") version "4.4.0" apply false
}