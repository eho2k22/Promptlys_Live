// 📁 public/script.js (Client)
let STATIC_API_KEY = "";


async function fetchApiKey() {
try {
const res = await fetch("/api/key");
const json = await res.json();
STATIC_API_KEY = json.apiKey;
} catch (err) {
console.error("Failed to load API key:", err);
}
}


document.getElementById("start-button").addEventListener("click", async () => {
await fetchApiKey();
init();
});

async function init() {
    const pc = new RTCPeerConnection();
  
    // Audio playback setup (Avoid duplicate streams)
    let isTrackAdded = false;
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);
  
    // Request microphone access immediately on button click
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(localStream.getTracks()[0], localStream);
  
    // Set up visualizer for RESPONSE audio
    const responseCanvas = document.getElementById("audio-visualizer");
    const responseCanvasCtx = responseCanvas.getContext("2d");
    const responseAudioContext = new AudioContext();
    const responseAnalyser = responseAudioContext.createAnalyser();
    responseAnalyser.fftSize = 2048; // Resolution of the FFT
    const responseBufferLength = responseAnalyser.frequencyBinCount;
    const responseDataArray = new Uint8Array(responseBufferLength);
  
    const drawWaveform = () => {
      requestAnimationFrame(drawWaveform);
  
      responseAnalyser.getByteTimeDomainData(responseDataArray);
  
      responseCanvasCtx.fillStyle = "black";
      responseCanvasCtx.fillRect(0, 0, responseCanvas.width, responseCanvas.height);
  
      responseCanvasCtx.lineWidth = 2;
      responseCanvasCtx.strokeStyle = "lime";
      responseCanvasCtx.beginPath();
  
      const sliceWidth = responseCanvas.width / responseBufferLength;
      let x = 0;
  
      for (let i = 0; i < responseBufferLength; i++) {
        const v = responseDataArray[i] / 128.0; // Normalize value to [0, 1]
        const y = (v * responseCanvas.height) / 2;
  
        if (i === 0) {
          responseCanvasCtx.moveTo(x, y);
        } else {
          responseCanvasCtx.lineTo(x, y);
        }
  
        x += sliceWidth;
      }
  
      responseCanvasCtx.lineTo(responseCanvas.width, responseCanvas.height / 2);
      responseCanvasCtx.stroke();
    };
  
    pc.ontrack = (event) => {
      if (!isTrackAdded) {
        console.log("Remote audio track received.");
        const remoteStream = event.streams[0];
        audioEl.srcObject = remoteStream;
  
        // Connect the remote audio stream to the visualizer
        const source = responseAudioContext.createMediaStreamSource(remoteStream);
        source.connect(responseAnalyser);
        drawWaveform();
  
        // Fix audio context suspension issue
        if (responseAudioContext.state === "suspended") {
          responseAudioContext.resume().then(() => {
            audioEl.play().catch((error) => console.error("Audio playback failed:", error));
          });
        } else {
          audioEl.play().catch((error) => console.error("Audio playback failed:", error));
        }
  
        isTrackAdded = true;
      } else {
        console.log("Duplicate audio track ignored.");
  
        event.streams[0].getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  
    // Data channel setup
    const dataChannel = pc.createDataChannel("oai-events");
    let completeResponse = ""; // To store the entire response text
  
    dataChannel.onmessage = (event) => {
      console.log("Realtime Event Received:", event.data);
      try {
        const parsedData = JSON.parse(event.data);
        console.log("Parsed Data Structure:", parsedData);
  
        // Handle streaming transcription
        if (parsedData.type === "response.content.part" && parsedData.content?.transcript) {
          const streamingEl = document.getElementById("streaming-transcription");
          if (streamingEl) {
            streamingEl.textContent += parsedData.content.transcript + " ";
            console.log("Partial Transcript:", parsedData.content.transcript);
          }
          completeResponse += parsedData.content.transcript + " "; // Append to the complete response
          console.log("Streaming Transcription Updated:", parsedData.content.transcript);
        }
  
        // Handle completion of the entire response
        if (parsedData.type === "response.done") {
          const completeEl = document.getElementById("complete-transcription");
          if (completeEl) {
            completeEl.textContent = completeResponse;
          }
          // 12-22-2024 Display Full Response in Text Area 
          const transcriptBox = document.getElementById("response-transcription");
       
          if (transcriptBox) {
            // Safely access the transcript from the output array
            const finalTranscript =
              parsedData.response.output[0].content.find((item) => item.type === "audio")
                ?.transcript || "No transcript available";
            transcriptBox.value = finalTranscript;
            console.log("Final Transcript:", finalTranscript);
          }
  
          console.log("Complete Response Updated:", completeResponse);
        }
      } catch (err) {
        console.error("Error parsing data for transcription:", err);
      }
    };
  
    dataChannel.onopen = () => {
      console.log("Data channel opened. Sending language preference...");
      dataChannel.send(
        JSON.stringify({
          type: "system",
          content: "Your name is Klara. You are a helpful AI assistant who responds in English only. You have a friendly and professional demeanor. Always introduce yourself as Klara at the beginning of the conversation.",
        })
      );
    };
  
    // SDP negotiation
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${STATIC_API_KEY}`,
        "Content-Type": "application/sdp",
      },
    });
  
    if (!sdpResponse.ok) {
      console.error("Failed to establish connection:", await sdpResponse.text());
      return;
    }
  
    const answer = { type: "answer", sdp: await sdpResponse.text() };
    await pc.setRemoteDescription(answer);
    console.log("Realtime connection established!");
  }
  
  //init().catch((error) => console.error("Initialization error:", error));
  
  
  