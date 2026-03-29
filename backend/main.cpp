#include <iostream>
#include <string>

int main() {
    std::string line;

    std::cout << "backend-ready" << std::endl;
    std::cout.flush();

    while (std::getline(std::cin, line)) {
        if (line == "ping") {
            std::cout << "pong" << std::endl;
        }
        else if (line == "get_version") {
            std::cout << "Traxxer backend v1.0" << std::endl;
        }
        else if (line == "exit") {
            std::cout << "bye" << std::endl;
            std::cout.flush();
            break;
        }
        else {
            std::cout << "unknown-command: " << line << std::endl;
        }

        std::cout.flush();
    }

    return 0;
}