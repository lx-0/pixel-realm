#!/bin/bash

# Install Butler on MacOS

mkdir -p ~/.local/bin
cd ~/.local/bin

curl -L -o butler.zip https://broth.itch.zone/butler/darwin-amd64/LATEST/archive/default
unzip -o butler.zip
rm butler.zip

chmod +x ~/.local/bin/butler
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
