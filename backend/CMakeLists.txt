cmake_minimum_required(VERSION 3.22)

project(TraxxerBackend VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(JUCE)

juce_add_console_app(TraxxerBackend
    PRODUCT_NAME "Traxxer Backend"
)

target_sources(TraxxerBackend
    PRIVATE
        main.cpp
        AudioEngine.cpp
        AudioEngine.h
)

target_compile_definitions(TraxxerBackend
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
)

target_link_libraries(TraxxerBackend
    PRIVATE
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_utils
        juce::juce_core
)

juce_audio_devices → abrir placa de som / gerir output
juce_audio_formats → ler ficheiros áudio
juce_audio_utils   → classes úteis de reprodução
juce_core          → base do JUCE