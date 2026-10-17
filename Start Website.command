#!/bin/zsh
# Opens the website on this Mac at http://localhost:8775 (close this window to stop).
cd "$(dirname "$0")"
open "http://localhost:8775"
python3 -m http.server 8775 --bind 127.0.0.1
