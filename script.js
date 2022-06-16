//API key for OpenWeatherMap
const openWeatherKey = "d8b9c9f29acf75b9bc89cdc565bacf19";

//Array - stores search values
var recentSearchesArray = [];

const recentSearchDropdown = document.querySelector("#recent-dropdown");

// After page loads - recent searches in dropdown
populateRecentSearchesDropdown();

//User recent search values
function populateRecentSearchesDropdown() {
  recentSearchDropdown.innerHTML = "<option>--Select a City--</option>";

  //Retrieve local storage recent search 
  var recentSearchArray = getRecentSearches();

  // Loop from end of array - recent search at top of dropdown menu
  for (let i = recentSearchArray.length - 1; i >= 0; i--) {
    const search = recentSearchArray[i];
    const newDropdownOption = document.createElement("option");
    newDropdownOption.setAttribute("id", search);
    recentSearchDropdown.appendChild(newDropdownOption);
    newDropdownOption.textContent = search;
  }
}

// Array in local storage = parsed and assigned variable
function getRecentSearches() {
  storedSearches = localStorage.getItem("recentSearches");
  if (storedSearches) {
    recentSearchesArray = JSON.parse(storedSearches);
  }
  return recentSearchesArray;
}

//If statement - City doesn't exist in array + length exceeds 10 = remove oldest item in array, appends new item 
function storeRecentSearches(cityName) {
  if (
    recentSearchesArray.includes(cityName) === false &&
    recentSearchesArray.length < 10
  ) {
    recentSearchesArray.push(cityName);
    localStorage.setItem("recentSearches", JSON.stringify(recentSearchesArray));
  } else if (
    recentSearchesArray.includes(cityName) === false &&
    (recentSearchesArray.length = 10)
  ) {
    recentSearchesArray.shift();
    recentSearchesArray.push(cityName);
    localStorage.setItem("recentSearches", JSON.stringify(recentSearchesArray));
  }
}

//Click triggers displayWeatherReport function
const searchButton = document.querySelector("#search-button");
searchButton.addEventListener("click", displayWeatherReport);

// Calls displayWeatherReport function when recent searches button clicked
const recentSearchesButton = document.querySelector("#recent-searches-button");
recentSearchesButton.addEventListener("click", displayWeatherReport);

//Async function enables asynchrous,promise-based behaviour to be written cleaner - either search buttons clicked triggers function 
async function displayWeatherReport(event) {
  event.preventDefault();

  var cityName = undefined;

  if (
    //If the search button is clicked on but there is no user input value, return (to prevent further execution of function)
    //otherwise assign the value to cityInput and invoke sanitizeUserInput
    event.target === searchButton ||
    event.target === searchButton.firstElementChild
  ) {
    var cityInput = document.querySelector("#city-input").value;
    if (!cityInput) {
      return;
    }
    cityName = sanitizeUserInput(cityInput);
  } else if (
    //if the recent searches search button is clicked on but no option is selected, return (to prevent further execution of function)
    //otherwise assign the value to cityInput and invoke sanitizeUserInput
    event.target === recentSearchesButton ||
    event.target === recentSearchesButton.firstElementChild
  ) {
    var dropdownMenu = document.getElementById("recent-dropdown");
    if (dropdownMenu.length <= 1) {
      return;
    }
    var selectedIndex = dropdownMenu.selectedIndex;
    cityInput = document.getElementsByTagName("option")[selectedIndex].value;
    cityName = sanitizeUserInput(cityInput);
  }

  //Gets city coordinates
  var locationData = await getCityLocation(cityName);
  var lat = locationData.coord.lat;
  var lon = locationData.coord.lon;

  //Gathers  current weather and forecast data
  var weatherForecast = await getWeatherForecast(lat, lon);

  //Displays city name on page
  document.querySelector("#city-name").textContent = cityName.toUpperCase();

  //Get current weather out of the weatherForecast object and pass to "colourUVIndex" function
  var currentWeatherData = weatherForecast.current;
  colourUVIndex(currentWeatherData);

  //Get date from unix value
  var currentDate = getDate(currentWeatherData);

  //Displays current date
  var currentDateHeader = document.querySelector("#current-date")
  currentDateHeader.textContent = currentDate;
  currentDateHeader.style.display = "block";

  //Values required for the current weather card
  weatherDataItems = [
    currentWeatherData.temp,
    currentWeatherData.humidity,
    currentWeatherData.wind_speed,
    currentWeatherData.uvi,
  ];

  //Make a collection containing each of the spans inside the list items that need to be populated with the weather data
  currentWeatherTextSpans = document.querySelector("#current-weather-list")
    .children;

  //Populate current weather data
  for (let i = 0; i < currentWeatherTextSpans.length; i++) {
    const currentWeatherListItem = currentWeatherTextSpans[i].firstElementChild;
    currentWeatherListItem.textContent = weatherDataItems[i];
  }

  //Displays 5 day forecast
  const weeklyForecast = weatherForecast.daily;

  //Populate icons
  getIcons(weeklyForecast);

  for (let i = 1; i < 6; i++) {
    const forecastData = weeklyForecast[i];

    //Get daily forecast date from unix value
    var dailyForecastDate = getDate(forecastData);

    //Display date on weather cards
    const dateHeader = document.querySelector(`#date-${i}`);
    dateHeader.textContent = dailyForecastDate;
    dateHeader.style.display = "block";

    weatherDataItems = [
      forecastData.temp.day,
      forecastData.humidity,
      forecastData.wind_speed,
    ];

    //Display weather data on weather cards
    const dailyWeatherTextSpans = document.querySelector(`#day-${i}`).children;
    for (let i = 0; i < dailyWeatherTextSpans.length; i++) {
      const dailyWeatherListItem = dailyWeatherTextSpans[i].firstElementChild;
      dailyWeatherListItem.textContent = weatherDataItems[i];
    }
  }
}

//Retrieves the city name entered by the user -> makes lowercase -> erases white spaces 
function sanitizeUserInput(cityInput) {
  cityInput = cityInput.toLowerCase().trim();
  return cityInput;
}

//Retrieves geographical coordinates of the city (lat/lon)
async function getCityLocation(cityName) {
  var locationQueryURL =
    "https://api.openweathermap.org/data/2.5/weather?q=" +
    cityName +
    "&appid=" +
    openWeatherKey;

  const cityLocationResponse = await fetch(locationQueryURL);

  //Update recent search dropdown if valid results are fetched
  updateRecentSearches(cityLocationResponse, cityName);

  //parse the city location data that's returned
  return await cityLocationResponse.json();
}

//Get weather forecast based on city latitude & longitude
async function getWeatherForecast(lat, lon) {
  var forecastQueryURL =
    "https://api.openweathermap.org/data/2.5/onecall?lat=" +
    lat +
    "&lon=" +
    lon +
    "&exclude=minutely,hourly,alerts&units=metric&appid=" +
    openWeatherKey;

  const weatherForecastResponse = await fetch(forecastQueryURL);
  return await weatherForecastResponse.json();
}

//Updates recent search dropdown if valid results are fetched
function updateRecentSearches(cityLocationResponse, cityName) {
  if (
    cityLocationResponse.status === 404 ||
    cityLocationResponse.status === 400
  ) {
    window.alert(
      "Location not found. Please ensure you are entering a valid location with correct spelling, and try again."
    );
  } else {
    //If user inputs valid data, then add to recent searches and repopulate dropdown
    recentSearchesArray = getRecentSearches();
    storeRecentSearches(cityName);
    populateRecentSearchesDropdown();
  }
}

//Set background colour of the uv index span based on risk level
function colourUVIndex(currentWeatherData) {
  var uvi = document.querySelector("#uv-index");
  if (currentWeatherData.uvi <= 2) {
    uvi.style.backgroundColor = "#ABF6B0";
  } else if (currentWeatherData.uvi <= 5) {
    uvi.style.backgroundColor = "#FFEC5C";
  } else if (currentWeatherData.uvi <= 7) {
    uvi.style.backgroundColor = "#FFB133";
  } else if (currentWeatherData.uvi <= 10) {
    uvi.style.backgroundColor = "#FF5C5C";
  } else if (currentWeatherData.uvi >= 11) {
    uvi.style.backgroundColor = "#DABBF2";
  }
}

//Array of months for date conversion
const monthsArray = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

//Array of days for date conversion
const daysArray = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

//Converts date from unix format to a readable format
function getDate(weatherData) {
  const rawDate = new Date(weatherData.dt * 1000);
  const currentDayAsIndex = rawDate.getDay();
  const currentDayValue = daysArray[currentDayAsIndex];
  const currentDateValue = rawDate.getDate();
  const currentMonthAsIndex = rawDate.getMonth();
  const currentMonthValue = monthsArray[currentMonthAsIndex];
  const currentYear = rawDate.getFullYear();
  const convertedDate =
    `${currentDayValue}, ` +
    `${currentDateValue} ` +
    `${currentMonthValue} ` +
    `${currentYear}`;
  return convertedDate;
}

//display the weather icons on the page
function getIcons(weatherData) {
  for (let i = 0; i < 6; i++) {
    weatherIcon = weatherData[i].weather[0].icon;
    iconElement = document.querySelector(`#icon-${i}`);
    iconElement.src =
      "http://openweathermap.org/img/wn/" + weatherIcon + "@2x.png";
  }
}
