/*global chrome*/

import React, { createContext } from "react";
import {
  Route,
  RouterProvider,
  createRoutesFromElements,
  createMemoryRouter,
} from "react-router-dom";
import "./App.css";

import Login from "./Components/Login";
import AiAgent from "./Components/AiAgent";
import Main from "./Components/Main";

// import Navigation from "./Components/Navigation";
import Layout from "./Components/Layout";
import "bootstrap/dist/css/bootstrap-grid.min.css"; // Only import the grid system to avoid losing icons
import { getTabInformation, updateState } from "./utils";
import Error from "./pages/Error";
// var port = chrome.runtime.connect({ name: "popupConnection" });
export const AppContext = createContext();

function App() {
  const [submittedUsername, setSubmittedUsername] = React.useState(null);
  const [state, setState] = React.useState(null);
  const [abstract, setAbstract] = React.useState(null);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  // Send a message each time the sidepanel opens
  React.useEffect(() => {
    chrome.runtime.sendMessage({ action: "firstOpen" }, (response) => {
      console.log("state upon open is", response.state);
      if (response.response === "TokenExist") {
        updateState(setState, response.state);
        setIsLoggedIn(true);
      } else {
        console.log("Token does not exist");
        setIsLoggedIn(false);
      }
    });
  }, []);

  // get the tab new information when tab is switched

  React.useEffect(() => {
    chrome.runtime.onMessage.addListener(async function (
      message,
      sender,
      sendResponse
    ) {
      if (message.action === "Tab Switched") {
        console.log("tab is swtiched and this is the new url,", message.url);
        const abstractInfo = await getTabInformation(message.url);
        setAbstract(abstractInfo);
      }
      if (message.action === "URL Changed") {
        console.log("tab is swtiched and this is the new url,", message.url);
        const abstractInfo = await getTabInformation(message.url);
        setAbstract(abstractInfo);
      }
    });
  }, []);

  React.useEffect(() => {
    chrome.runtime.onMessage.addListener(function (
      message,
      sender,
      sendResponse
    ) {
      if (message.action === "updateState") {
        console.log("state will be update for the ");
        console.log(message.state);
        updateState(setState, message.state);
      }
    });
  }, []);

  // This function will only run if username changes(if we enter a username)
  React.useEffect(() => {
    async function sendMessage() {
      if (submittedUsername !== null) {
        chrome.runtime.sendMessage(
          { action: "loginRequest", submittedUsername },
          async function (response) {
            // This will update the state after the login was successfull
            // response state contains the token and the username here
            updateState(setState, response.state);
          }
        );
      }
    }

    sendMessage(); // Call the async function to send the message
  }, [submittedUsername]);

  // callback function to receive the username from Login component
  function handleLoginChange(submittedUsername) {
    setSubmittedUsername(submittedUsername);
  }
  function handleLogoutChange() {
    console.log("user has logged out");
    // Deleting the state upon logout
    setState(null);
    chrome.runtime.sendMessage({ action: "logoutRequest" });
  }

  React.useEffect(() => {
    const fetchTabData = async () => {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const currentTab = tabs[0];
        // send url to the function and get url, originaltitle and originalabstract
        const abstractInfo = await getTabInformation(currentTab.url);
        setAbstract(abstractInfo);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchTabData();
  }, []);

  const router = createMemoryRouter(
    createRoutesFromElements(
      <Route path="/" errorElement={<Error />} element={state && <Layout />}>
        <Route
          path="/login"
          errorElement={<Error />}
          element={!isLoggedIn ? <Login /> : null}
        />
        <Route path="/aiagent" errorElement={<Error />} element={<AiAgent />} />
        <Route path="/main" errorElement={<Error />} element={<Main />} />
      </Route>
    )
  );

  return (
    <div className="App">
      <AppContext.Provider
        value={{
          state,
          setState,
          handleLoginChange,
          handleLogoutChange,
          abstract,
        }}
      >
        <RouterProvider router={router} />
      </AppContext.Provider>
      {/* {
        state && state.accessToken ? (
          <>
            <Header state={state} handleLogout={handleLogoutChange} />
            {abstract && state && !state.isLoading && (
              <GetSummary setState={setState} tabAbstract={abstract} />
            )}
          </>
        ) : null
        <Login handleLogin={handleLoginChange} />
      }

      {state && !state.isLoading && !state.abstractData && <Instructions />}
      {state && !state.isLoading && state.abstractData && (
        <Abstracts abstracts={state.abstractData} />
      )}

      {state && state.isLoading ? <Loading /> : ""} */}
    </div>
  );
}

export default App;
