cmake_minimum_required(VERSION 3.22)

project(TraxxerBackend VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(JUCE)

# libkeyfinder
find_library(KEYFINDER_LIB keyfinder PATHS /ucrt64/lib)
find_path(KEYFINDER_INCLUDE keyfinder/keyfinder.h PATHS /ucrt64/include)

# libsndfile para leitura de áudio
find_library(SNDFILE_LIB sndfile PATHS /ucrt64/lib)
find_path(SNDFILE_INCLUDE sndfile.h PATHS /ucrt64/include)

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

target_include_directories(TraxxerBackend
    PRIVATE
        ${KEYFINDER_INCLUDE}
        ${SNDFILE_INCLUDE}
)

target_link_libraries(TraxxerBackend
    PRIVATE
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_utils
        juce::juce_core
        ${KEYFINDER_LIB}
        ${SNDFILE_LIB}
)