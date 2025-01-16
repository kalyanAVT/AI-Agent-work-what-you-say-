const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const OpenAI = require("openai");
const googleTTS = require("google-tts-api");
require("dotenv").config();

// Initialize OpenAI Client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// Function to generate audio from text using Google TTS
const generateAudioUrl = async (text) => {
  try {
    // Google TTS has a limit of 200 characters per request
    const chunkSize = 200;
    const textChunks = [];

    // Split text into chunks if it's longer than the limit
    while (text.length > chunkSize) {
      textChunks.push(text.substring(0, chunkSize));
      text = text.substring(chunkSize);
    }
    textChunks.push(text);  // Add the final chunk

    // Generate audio URLs for each chunk
    const audioUrls = [];
    for (let chunk of textChunks) {
      const url = googleTTS.getAudioUrl(chunk, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
      });
      audioUrls.push(url);
    }

    return audioUrls;
  } catch (error) {
    console.error("Error generating audio:", error);
    return null;
  }
};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("voiceCommand", async (message) => {
    console.log("Received voice command:", message);

    try {
      // Send the message to OpenAI API and get the response
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const aiText = response.choices[0]?.message?.content?.trim();
      console.log("AI Response:", aiText);

      // If we have a valid AI response, generate audio URLs
      if (aiText) {
        const audioUrls = await generateAudioUrl(aiText);
        if (audioUrls && audioUrls.length > 0) {
          // Emit the AI text and audio URLs to the client
          socket.emit("aiResponse", {
            text: aiText,
            audioUrls: audioUrls,
          });
        } else {
          socket.emit("aiResponse", {
            text: aiText,
            audioUrls: [],
          });
        }
      } else {
        socket.emit("aiResponse", {
          text: "Sorry, I could not process your request.",
          audioUrls: [],
        });
      }
    } catch (error) {
      console.error("Error with OpenAI API:", error.message);
      socket.emit("aiResponse", {
        text: "Sorry, I encountered an error processing your request.",
        audioUrls: [],
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
