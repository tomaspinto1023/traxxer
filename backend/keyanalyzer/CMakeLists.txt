cmake_minimum_required(VERSION 3.22)

project(TraxxerKeyAnalyzer VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_library(KEYFINDER_LIB keyfinder PATHS /ucrt64/lib)
find_path(KEYFINDER_INCLUDE keyfinder/keyfinder.h PATHS /ucrt64/include)
find_library(SNDFILE_LIB sndfile PATHS /ucrt64/lib)
find_path(SNDFILE_INCLUDE sndfile.h PATHS /ucrt64/include)

add_executable(TraxxerKeyAnalyzer KeyAnalyzer.cpp)

target_include_directories(TraxxerKeyAnalyzer
    PRIVATE
        ${KEYFINDER_INCLUDE}
        ${SNDFILE_INCLUDE}
)

target_link_libraries(TraxxerKeyAnalyzer
    PRIVATE
        ${KEYFINDER_LIB}
        ${SNDFILE_LIB}
)