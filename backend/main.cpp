#include <iostream>
#include <string>

#include "AudioEngine.h"

int main()
{
    AudioEngine audioEngine;

    if (!audioEngine.initialise())
    {
        std::cout << "backend-error: audio-init-failed" << std::endl;
        std::cout.flush();
        return 1;
    }

    std::string line;

    std::cout << "backend-ready" << std::endl;
    std::cout.flush();

    while (std::getline(std::cin, line))
    {
        if (line == "ping")
        {
            std::cout << "pong" << std::endl;
        }
        else if (line == "get_version")
        {
            std::cout << "Traxxer backend v1.0 with JUCE" << std::endl;
        }
        else if (line == "play_test")
        {
            audioEngine.playTestTone();
            std::cout << "playing-test-tone" << std::endl;
        }
        else if (line == "stop")
        {
            audioEngine.stop();
            std::cout << "stopped" << std::endl;
        }
        else if (line == "exit")
        {
            audioEngine.shutdown();

            std::cout << "bye" << std::endl;
            std::cout.flush();
            break;
        }
        else
        {
            std::cout << "unknown-command: " << line << std::endl;
        }

        std::cout.flush();
    }

    return 0;
}