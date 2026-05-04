#pragma once

#include <JuceHeader.h>

class AudioEngine
{
public:
    AudioEngine();
    ~AudioEngine();

    bool initialise();
    void shutdown();

    void playTestTone();
    void stop();

private:
    juce::AudioDeviceManager deviceManager;
    juce::AudioSourcePlayer audioSourcePlayer;
    juce::ToneGeneratorAudioSource toneSource;

    bool isReady = false;
};