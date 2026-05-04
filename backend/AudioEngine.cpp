#include "AudioEngine.h"

AudioEngine::AudioEngine()
{
}

AudioEngine::~AudioEngine()
{
    shutdown();
}

bool AudioEngine::initialise()
{
    auto error = deviceManager.initialise(
        0,      // número de inputs
        2,      // número de outputs
        nullptr,
        true
    );

    if (error.isNotEmpty())
    {
        std::cerr << "JUCE audio init error: " << error << std::endl;
        return false;
    }

    toneSource.setFrequency(440.0);
    toneSource.setAmplitude(0.15f);

    audioSourcePlayer.setSource(&toneSource);
    deviceManager.addAudioCallback(&audioSourcePlayer);

    isReady = true;
    return true;
}

void AudioEngine::shutdown()
{
    if (isReady)
    {
        deviceManager.removeAudioCallback(&audioSourcePlayer);
        audioSourcePlayer.setSource(nullptr);
        isReady = false;
    }
}

void AudioEngine::playTestTone()
{
    if (!isReady)
        return;

    toneSource.setAmplitude(0.15f);
}

void AudioEngine::stop()
{
    toneSource.setAmplitude(0.0f);
}