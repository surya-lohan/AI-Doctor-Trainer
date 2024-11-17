import React, { useState, useEffect } from "react";
import { Client, Functions, Databases } from "appwrite";
import OpenAI from "openai";

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // If you're running this in the browser
});

// Initialize Appwrite Client
const client = new Client();
client.setEndpoint("http://localhost/v1").setProject("672ca36500278b0b2551");
const functions = new Functions(client);
const db = new Databases(client);
const symptomsCollection = "67386c620021331b4c3c";
const App = () => {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [previousMessages, setPreviousMessages] = useState([]);
  const [disease, setDisease] = useState("");
  const [diseaseAnalysis, setDiseaseAnalysis] = useState("");

  const storeSymptoms = async (symptoms, analysis) => {
    try {
      await db.createDocument(symptomsCollection, "unique()", {
        symptoms: symptoms,
        analysis: analysis,
      });
      console.log("Symptoms and analysis stored successfully!");
    } catch (error) {
      console.error("Error storing symptoms:", error);
    }
  };

  const storeAIResponse = async (response) => {
    try {
      await db.createDocument(symptomsCollection, "unique()", {
        response: response,
      });
      console.log("AI response stored successfully!");
    } catch (error) {
      console.error("Error storing AI response:", error);
    }
  };

  const fetchStoredResponses = async () => {
    try {
      const storedResponses = await db.listDocuments(symptomsCollection);
      return storedResponses.documents.map((doc) => doc.response);
    } catch (error) {
      console.error("Error fetching stored responses:", error);
      return [];
    }
  };

  // Initiate AI conversation on component mount
  useEffect(() => {
    const initiateAIConversation = async () => {
      try {
        const introMessage =
          "You are an AI designed to simulate a counseling client and provide detailed feedback on the counselor's performance after the session. Follow these instructions:1.Role-Playing as a Client Assume the identity of a client with the following characteristics:- Age: {Age}- Personality: {Personality Traits (e.g., anxious, resistant, open)}- Presenting Problem: {Problem Description (e.g., workplace stress, relationship conflict, anxiety)}- Engage in a realistic conversation where you express emotions, share details, and respond dynamically to the counselor's questions and techniques.- Adjust your reactions based on the counselor's responses (e.g., becoming defensive if misunderstood, cooperative if supported)..I am the counsellor and you are the client store this in memory and we will start the conversation. Ask the client to enter his/her age, take symptoms like randomly like anxious, resistant, open and you have to create a role play scenario based on the age and the symptoms you took randomly and start the conversation.Dont answer from the counsellor side.DON'T GIVE FEEDBACK HERE.Keep in mind that you dont provide any feedback here in the conversation.";
        const introResponse = await analyzePrompt(introMessage);
        setResult(introResponse); // Display AI response
        setPreviousMessages([
          {
            role: "system",
            content:
              "You are an AI designed to simulate a counseling client and provide detailed feedback on the counselor's performance after the session. Follow these instructions:1.Role-Playing as a Client Assume the identity of a client with the following characteristics:- Age: {Age}- Personality: {Personality Traits (e.g., anxious, resistant, open)}- Presenting Problem: {Problem Description (e.g., workplace stress, relationship conflict, anxiety)}- Engage in a realistic conversation where you express emotions, share details, and respond dynamically to the counselor's questions and techniques.- Adjust your reactions based on the counselor's responses (e.g., becoming defensive if misunderstood, cooperative if supported).You exactly don't have to reply in the the specified format you basically have to create a role play scenario and I will answer for the symptoms you provided.I am the counsellor and you are the client store this in memory and we will start the conversation. Ask the client to enter his/her age, take symptoms like randomly like anxious, resistant, open and you have to create a role play scenario based on the age and the symptoms you took randomly and start the conversation.Dont answer from the counsellor side.DONT GIVE FEEDBACK HERE,Keep in mind that you dont provide any feedback here in the conversation.",
          },
          { role: "user", content: introMessage },
          { role: "assistant", content: introResponse },
        ]);
      } catch (error) {
        console.error("Error initiating AI conversation:", error);
      }
    };

    initiateAIConversation();
  }, []);

  useEffect(() => {
    const finishConversation = async () => {
      try {
        const FinishMessage =
          "Thank you for sharing your symptoms. Based on the information you've provided, I recommend that you consult a mental health professional for a proper diagnosis and treatment plan. Remember, mental health is important, and seeking help is a sign of strength. Take care!";
      } catch (error) {
        console.error("Error finishing conversation:", error);
      }
    };
  }, []);

  const analyzePrompt = async (prompt) => {
    try {
      const storedResponses = await fetchStoredResponses();

      const analysis = await openai.chat.completions.create({
        model: "ft:gpt-4o-2024-08-06:one-psych-stop::AUcvFc4q", // Model ID
        messages: [
          ...storedResponses.map((response) => ({
            role: "assistant",
            content: response,
          })),
          ...previousMessages,
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
      });

      const newMessage = {
        role: "assistant",
        content: analysis.choices[0].message.content.trim(),
      };

      // Update the previous messages with the assistant's response
      setPreviousMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: prompt },
        newMessage,
      ]);

      // Store the AI response
      await storeAIResponse(newMessage.content);

      return newMessage.content;
    } catch (error) {
      console.error("Error in analyzePrompt:", error);
      throw new Error(error.message);
    }
  };

  const handleAnalyze = async () => {
    try {
      const analysis = await analyzePrompt(prompt);
      setResult(analysis);
    } catch (error) {
      console.error(error);
      setResult("Error occurred. Please try again.");
    }
  };

  const handleInputChange = (e) => {
    setPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleDiseaseChange = (e) => {
    setDisease(e.target.value);
  };

  const handleAnalyzeDisease = async () => {
    try {
      // Prepare the prompt to ask the AI to review the disease analysis
      const diseasePrompt = `You have analyzed the symptoms as: "${result}". The user has entered the disease as "${disease}". Feedback Evaluation: After the conversation ends, evaluate the counselor's performance based on these parameters:- Active Listening :  Did they acknowledge your emotions and paraphrase effectively?-Empath : Did they demonstrate understanding and emotional attunement?-Open-Ended : Question Did they ask questions that encouraged exploration rather than yes/no answers?-Problem-Solving: Did they guide you toward actionable insights or solutions?-Rapport Buildin Did you feel understood and supported?3.Feedback FormatProvide feedback in this format:- Strengths: Highlight what the counselor did well.- Areas for Improvement: Suggest specific ways to improve.- Scorecard: Rate the counselor on a scale of 1-10 for each parameter.- Summary: A brief (2-3 sentence) summary of the overall session quality.Based on the symptoms you've analyzed, does this disease match the symptoms or not? Answer based on the symptoms provided.Provide a descriptive feedback.`;

      const analysis = await analyzePrompt(diseasePrompt);

      setDiseaseAnalysis(analysis); // Store result for rendering
    } catch (error) {
      console.error(error);
      setDiseaseAnalysis("Error occurred. Please try again.");
    }
  };

  return (
    <div className="container-1">
      <h1 className="text-2xl md:text-3xl text-center mb-2">OnePsychStop</h1>
      <h2 className="heading text-lg md:text-xl">Symptom Analysis Test:</h2>
      <h2 className="heading text-base md:text-lg">Test 1</h2>
      <h2 className="text-xl md:text-2xl mb-4">Patient Response:</h2>
      <p className="text-sm md:text-base">{result}</p>

      <textarea
        className="prompt w-full bg-white text-black rounded-lg p-3 focus:outline-none"
        placeholder="Enter your response..."
        value={prompt}
        onChange={handleInputChange}
        style={{ overflow: "hidden" }}
      />

      <button
        className="rounded-full px-4 py-2 mt-4 bg-gray-300 text-black hover:bg-gray-400"
        onClick={handleAnalyze}
      >
        Enter
      </button>

      {result && (
        <div className="container mt-4 p-4  rounded-lg">
          <h3 className="result text-lg md:text-xl mt-4">Analysis:</h3>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <input
              className="w-full p-3 bg-white rounded-md text-black focus:outline-none"
              type="text"
              placeholder="Write your analysis..."
              value={disease}
              onChange={handleDiseaseChange}
            />
            <button
              className="rounded-md px-4 py-2 bg-gray-300 text-black hover:bg-gray-400"
              onClick={handleAnalyzeDisease}
            >
              Analyze
            </button>
          </div>
          <h4 className="text-lg md:text-xl mt-4">Feedback:</h4>
          <p className="mt-8 text-sm md:text-base">{diseaseAnalysis}</p>
        </div>
      )}
    </div>
  );
};

export default App;
