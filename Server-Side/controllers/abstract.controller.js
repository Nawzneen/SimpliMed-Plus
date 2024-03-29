// const User = require("../models/user");
const Abstract = require("../models/abstract");
const Interaction = require("../models/interaction");
const Feedback = require("../models/feedback");
const Suggestion = require("../models/suggestion");

const { sendHttpRequest, sendHttpsRequest } = require("../utils/requestUtils");
const axios = require("axios");
// const feedback = require("../models/feedback");

// fetch abstracts
async function requestToOpenAI(text, systemPrompt, userPrompt) {
  const payload = {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `${systemPrompt}`,
      },
      {
        role: "user",
        content: `${userPrompt}: ${text}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 900,
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_TOKEN}`,
        },
      }
    );
    if (response.status !== 200) {
      throw new Error(`Error code: ${response.status}. ${response.data}`);
    }
    const message = response.data.choices[0].message.content;
    let result = { message: message, status: "Ok" };
    return result;
  } catch (error) {
    let result = { status: "Error" };
    return result;
  }
}
//

exports.submitFeedback = async (req, res) => {
  console.log(
    "this is request body -==--==============================================================================================",
    req.body
  );

  const feedback = new Feedback({
    userID: req.user.id,
    interactionID: req.body.interactionID,
    abstractID: req.body.abstractID,
    originalDifficulty: req.body.originalDifficulty,
    advancedDifficulty: req.body.advancedDifficulty,
    elementaryDifficulty: req.body.elementaryDifficulty,
    onBoardingQuestionnaire: req.body.onBoardingQuestionnaire,
    originalTime: req.body.originalTime,
    advancedTime: req.body.advancedTime,
    elementaryTime: req.body.elementaryTime,
  });

  await feedback
    .save()
    .then((feedback) => {
      console.log("feedback submitted.");
      res.status(200).send({
        message: "feedback registered successfully",
        feedback,
      });
    })
    .catch((err) => {
      console.log("Error submitting feedback.");
      res.status(500).send({ message: err });
    });
  // res.status(200).send({ message: "Done" });
  return;
};

////
async function requestResults(req) {
  console.log("the request in server is:", req.body);

  const systemPrompt =
    "You are an expert science communicator who understands how to simplify scientific text specifically in the medical field. You can simplify the text based on different levels of simplification. In this task, you must simplify the given text, using the user's description.";

  const advancedPrompt =
    "Simplify the following abstract of a medical article while retaining the main idea. The target audience is individuals with an undergraduate university degree. Use language that is understandable for this audience while keeping some technical terms that are not overly complicated. Try not to summerize it. Ensure that the main idea of the original text is preserved without adding any additional information. this is the abstract:";

  const elementaryPrompt =
    "Simplify the following abstract of a medical article while retaining the main idea. The target audience is individuals with an elementary school education degree. Use easy-to-understand language and avoid technical jargon and complex terms. You are allowed to summerize the text, but try not to summerize it too much. Ensure that the main idea of the original text is preserved without adding any additional information.  this is the abstract";

  const titlePrompt = "Simplify the following title:";

  const advancedResult = await requestToOpenAI(
    req.body.originalAbstract,
    systemPrompt,
    advancedPrompt
  );
  const elementaryResult = await requestToOpenAI(
    req.body.originalAbstract,
    systemPrompt,
    elementaryPrompt
  );
  const titleResult = await requestToOpenAI(
    req.body.originalTitle,
    systemPrompt,
    titlePrompt
  );

  // res.status(200).send({ message: "Done" });
  return {
    advancedAbstract: advancedResult.message,
    elementaryAbstract: elementaryResult.message,
    summerizedTitle: titleResult.message,
  };
}
exports.requestAbstract = async (req, res) => {
  console.log("Abstract Requested.");

  let abstract = null;
  await Abstract.findOne({ url: req.body.url })
    .exec()
    .then((anAbstract) => {
      abstract = anAbstract;
      // Checking if the abstract already exist in the databas
      if (anAbstract != null) {
        console.log("Abstract Already Exists. ", abstract);
      }
    })
    .catch((err) => {
      console.log("Abstract Request Error.");
      res.status(500).send({ message: err });
      throw new Error("Abort");
    });
  // Creating a new Abstract Record if it doesnt already exist
  if (abstract == null) {
    console.log("Creating a new Abstract Record.");
    // add api call
    const results = await requestResults(req);
    console.log("this is final results", results);
    //
    abstract = new Abstract({
      url: req.body.url,
      originalTitle: req.body.originalTitle,
      originalAbstract: req.body.originalAbstract,
      summerizedTitle: results.summerizedTitle,
      advancedAbstract: results.advancedAbstract,
      elementaryAbstract: results.elementaryAbstract,
    });

    try {
      await abstract
        .save()
        .then((anAbstract) => {
          console.log("Created a new Abstract Record.");
        })
        .catch((err) => {
          console.log("Error Creating a new Abstract Record.");
          res.status(500).send({
            message:
              "There was an error generating all the content, please try again!",
          });
          throw new Error("Abort");
        });
    } catch {
      return; //added to stop the app from crashing
    }
  }

  // Check if there is any feedback for this abstract id or not
  let feedback = null;
  await Feedback.findOne({ abstractID: abstract._id, userID: req.user.id })
    .exec()
    .then((aFeedback) => {
      feedback = aFeedback;
      // Checking if the abstract already has a feedback with this user id
      if (aFeedback != null) {
        console.log("feedback Already Exists. ", feedback);
      }
    })
    .catch((err) => {
      console.log("Feedback Request Error.");
      // res.status(500).send({ message: err });
      // throw new Error("Abort");
    });
  //
  const interaction = new Interaction({
    userID: req.user.id,
    abstractID: abstract._id,
    originalTime: req.body.originalTime,
    advancedTime: req.body.advancedTime,
    elementaryTime: req.body.elementaryTime,
  });
  // interaction will be saved regardless of the existance of the abstract in database
  await interaction
    .save()
    .then((interaction) => {
      console.log("Logged Interaction.");
      res.status(200).send({
        message: "Interaction registered successfully",
        abstract,
        feedback,
        interactionId: interaction._id,
      });
    })
    .catch((err) => {
      console.log("Error Logging Interaction.");
      res.status(500).send({ message: err });
      throw new Error("Abort");
    });
};

// SIMPLIMED PLUS, USER ASK A QUESITON AND RECIEVE KEYWORD SUGGESTIONS
exports.requestKeywords = async (req, res) => {
  console.log("keywords Requested.");
  const results = await requestKeywords(req);
  const suggestion = new Suggestion({
    userID: req.user.id,
    interactionID: req.body.interactionID,
    initialQuestion: req.body.initialQuestion,
    suggestedKeywords: results.suggestedKeywords,
  });

  await suggestion
    .save()
    .then(() => {
      console.log("intial question submitted.");
      res.status(200).send({
        message: "intial question registered successfully",
        suggestion,
      });
    })
    .catch((err) => {
      console.log("Error submitting initial question.", err);
      res.status(500).send({ message: err });
    });
  return;
};
async function requestKeywords(req) {
  const suggestKeywordsPrompt =
    "Sugguest 5 keywords to search for articles in pubmed database based on this question:";
  const systemPrompt =
    "You suggest keywords in medical domain to help people search articles in pubmed database";

  const suggestedKeywords = await requestToOpenAI(
    req.body.initialQuestion,
    systemPrompt,
    suggestKeywordsPrompt
  );
  console.log(suggestedKeywords);
  return {
    suggestedKeywords: suggestedKeywords.message,
  };
}
