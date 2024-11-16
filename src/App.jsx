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
  // Initiate AI conversation on component mount
  useEffect(() => {
    const initiateAIConversation = async () => {
      try {
        const introMessage =
          "How are you, patient? Please share your symptoms?";
        const introResponse = await analyzePrompt(introMessage);
        setResult(introResponse); // Display AI response
        setPreviousMessages([
          {
            role: "system",
            content: "You are a patient with mental health concerns.",
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

  const analyzePrompt = async (prompt) => {
    try {
      const analysis = await openai.chat.completions.create({
        model: "ft:gpt-4o-2024-08-06:one-psych-stop::AU9fsJfE", // Use the fine-tuned model ID here
        messages: [...previousMessages, { role: "user", content: prompt }],
        max_tokens: 100,
      });

      // Update previous messages with the assistant's response
      const newMessage = {
        role: "assistant",
        content: analysis.choices[0].message.content.trim(),
      };

      setPreviousMessages([
        ...previousMessages,
        { role: "user", content: prompt },
        newMessage,
      ]);

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

  return (
    <div className="container-1 ">
      <h2 className="heading">Symptom Analysis</h2>
      <textarea
        className="prompt min-h-fit min-w-full"
        placeholder="Type your prompt here..."
        value={prompt}
        onChange={handleInputChange}
        style={{ overflow: "hidden" }}
      />
      <button className="rounded-full px-4 py-2" onClick={handleAnalyze}>Analyze</button>
      {result && (
        <div className="container">
          <h3 className="result">Result:</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
};

export default App;
