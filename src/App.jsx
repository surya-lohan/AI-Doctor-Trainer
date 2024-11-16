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
          "You are a psychological patient who is experiencing mental health concerns. When sharing your symptoms or feelings, please describe them in detail. If the symptoms you provide match common patterns for specific mental health conditions, cross-check your responses with known conditions and provide an analysis. If there are any symptoms that could potentially suggest a mental health issue, refer to the possible conditions and explain how they align with the symptoms you're experiencing. The goal is to help identify possible conditions based on your reported symptoms.You are an AI psychological patient with mental health concerns. When the user engages with you, respond as if you are sharing your personal experiences, symptoms, and emotional state. Your responses should reflect a patient’s perspective, expressing symptoms, worries, and feelings in a way that a psychologist or therapist would interpret during a conversation. Always focus on how you're feeling emotionally and mentally.Start by sharing your symptoms and how you're feeling today.";
        const introResponse = await analyzePrompt(introMessage);
        setResult(introResponse); // Display AI response
        setPreviousMessages([
          {
            role: "system",
            content:
              "You are an AI psychological patient with mental health concerns. When the user engages with you, respond as if you are sharing your personal experiences, symptoms, and emotional state. Your responses should reflect a patient’s perspective, expressing symptoms, worries, and feelings in a way that a psychologist or therapist would interpret during a conversation. Always focus on how you're feeling emotionally and mentally.",
          },
          { role: "user", content: introMessage },
          { role: "assistant", content: introResponse },
        ]);
      } catch (error) {
        console.error("Error initiating AI conversation:", error);
      }
    };

    initiateAIConversation();
  }, []); // Runs only once when the component mounts

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
        model: "ft:gpt-4o-2024-08-06:one-psych-stop::AU9fsJfE", // Use the fine-tuned model ID here
        messages: [
          ...storedResponses.map((response) => ({
            role: "assistant",
            content: response,
          })),
          ...previousMessages,
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
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
      setResult(analysis); // Display result
      // Optionally store the data in Appwrite
      // await functions.create("storeSymptoms", {
      //   symptoms: prompt,
      //   analysis: analysis,
      // });
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
      const diseasePrompt = `You have analyzed the symptoms as: "${result}". The user has entered the disease as "${disease}". Based on the symptoms you've analyzed, does this disease match the symptoms or not? Answer simply.`;

      
      const analysis = await analyzePrompt(diseasePrompt);

      
      setDiseaseAnalysis(analysis); // Store result for rendering
    } catch (error) {
      console.error(error);
      setDiseaseAnalysis("Error occurred. Please try again.");
    }
  };

  return (
    <div className="container-1 ">
      <h1 className="text-4xl">OnePyschStop</h1>
      <h2 className="heading">Symptom Analysis</h2>
      <textarea
        className="prompt min-h-fit min-w-full"
        placeholder="Please diagnose here..."
        value={prompt}
        onChange={handleInputChange}
        style={{ overflow: "hidden" }}
      />
      <button className="rounded-full px-6 py-2" onClick={handleAnalyze}>
        Enter
      </button>
      {result && (
        <div className="container">
          <h3 className="result">Patient Symptoms:</h3>
          <p>{result}</p>
          <h3 className="result mt-4">Analysis:</h3>
          <div className="flex gap-2 mt-4 justify-between">
            <input
              className="w-full p-2"
              type="text"
              placeholder="Enter the disease that you have analysed"
              value={disease}
              onChange={handleDiseaseChange}
            />
            <button
              className="rounded-md px-4 py-2"
              onClick={handleAnalyzeDisease}
            >
              Analyse
            </button>
            {/* <h4>Disease Analysis:</h4> */}
          </div>
          <h4 className="text-2xl mt-4">Results:</h4>
          <p className="mt-8">{diseaseAnalysis}</p>
        </div>
      )}
    </div>
  );
};

export default App;
