# sevenofhearts
WT Mini Project

Steps to Run this project:

1. git clone the repo

On command prompt run the following when inside repo folder:

2. cd frontend
   npm i

3. cd ..
   cd backend
   npm i

4. ipconfig
   Copy IPv4 address

5. Open frontend/src/App.jsx and replace the ip there with your own ip

6. in ./frontend
    npm run dev -- --host

7. in ./backend
  node index.js

Note: Make sure all devices that you are using to play are connected on the same Wi-Fi network

In the search bar of the browser, type http://<your-ip>:5173

One person (the host) types username and the room id (must be integer) and presses create room
All others type username and room id as given by host and join the room.

Have fun!
