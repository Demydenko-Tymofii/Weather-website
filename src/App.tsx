import { For, Match, Show, Switch, createSignal } from "solid-js";
import "./Loading.scss";
import "./App.scss";

// import cloudWithLightningAndRain from "./assets/cloud-with-lightning-and-rain.png";
import sunIcon from "./assets/sun.png";
import fogIcon from "./assets/fog.png";
import cloudIcon from "./assets/cloud.png";
import sunBehindRainCloudIcon from "./assets/sun-behind-rain-cloud.png";
import cloudWithRainIcon from "./assets/cloud-with-rain.png";
import cloudWithSnowIcon from "./assets/cloud-with-snow.png";
import cloudWithLightningAndRainIcon from "./assets/cloud-with-lightning-and-rain.png";
import tornadoIcon from "./assets/tornado.png";

import sunriseIcon from "./assets/sunrise.png";
import sunsetIcon from "./assets/sunset.png";

interface WeatherInfo {
  time: string;
  weather: string;
  temperature: number;
}
interface DaylyWeatherInfo {
  day: string;
  weather: string;
  description: string;
  temperatureMax: number;
  temperatureMin: number;
}

const ICONS: { [weather: string]: string } = {
  Clear: sunIcon,
  Clouds: cloudIcon,
  Rain: cloudWithRainIcon,
  Snow: cloudWithSnowIcon,
  Drizzle: sunBehindRainCloudIcon,
  Thunderstorm: cloudWithLightningAndRainIcon,

  Mist: fogIcon,
  Smoke: fogIcon,
  Haze: fogIcon,
  Dust: fogIcon,
  Fog: fogIcon,
  Sand: fogIcon,
  Ash: fogIcon,
  Squall: fogIcon,
  Tornado: tornadoIcon,
};

const BADNESS: { [weather: string]: number } = {
  Clear: 0,
  Clouds: 1,
  Drizzle: 2,
  Rain: 3,
  Snow: 4,
  Thunderstorm: 5,

  Mist: 1,
  Smoke: 1,
  Haze: 1,
  Dust: 2,
  Fog: 1,
  Sand: 2,
  Ash: 2,
  Squall: 5,
  Tornado: 10,
};

const APPID = "b03a2cfad336d11bd9140ffd92074504";

function App() {
  const [city, setCity] = createSignal("");
  const [sunriseTime, setSunriseTime] = createSignal("");
  const [sunsetTime, setSunsetTime] = createSignal("");
  const [weather, setWeather] = createSignal("");
  const [temperature, setTemperature] = createSignal(0);
  const [temperatureMax, setTemperatureMax] = createSignal(0);
  const [temperatureMin, setTemperatureMin] = createSignal(0);
  const [temperatureFeel, setTemperatureFeel] = createSignal(0);
  const [windSpeed, setWindSpeed] = createSignal(0);

  const [hourly, setHourly] = createSignal<WeatherInfo[]>([], {
    equals: false,
  });
  const [dayly, setDayly] = createSignal<DaylyWeatherInfo[]>([], {
    equals: false,
  });

  const [isDayly, setIsDayly] = createSignal(false);
  const [loaded, setLoaded] = createSignal(false);

  function getTimeString(utc: number) {
    return new Date(utc * 1000).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: undefined,
    });
  }

  function readCurrentData(cityData: {
    name: string;
    id: number;
    sys: { sunrise: number; sunset: number };

    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
    };
    wind: { speed: number };
    weather: { main: string; description: string }[];
  }) {
    // console.log(cityData);
    setCity(cityData.name);
    setSunriseTime(getTimeString(cityData.sys.sunrise));
    setSunsetTime(getTimeString(cityData.sys.sunset));

    setWeather(cityData.weather[0].main);
    setTemperature(Math.round(cityData.main.temp));
    setTemperatureFeel(Math.round(cityData.main.feels_like));
    setWindSpeed(Math.round(cityData.wind.speed));

    fetch(
      `http://api.openweathermap.org/data/2.5/forecast?id=${cityData.id}&units=metric&appid=${APPID}`
    )
      .then((body) => body.json())
      .then(readData5Days);
  }
  function readData5Days(data: {
    city: { name: string; sunrise: number; sunset: number };
    list: {
      dt: number;
      main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
      };
      weather: { main: string; description: string }[];
    }[];
  }) {
    // console.log(`City: ${data.city.name}`);
    // console.log(data);

    // console.log(data.list.slice(0, 8));

    let max = Number.MIN_VALUE;
    let min = Number.MAX_VALUE;

    let hourly: WeatherInfo[] = [];
    for (const forecast of data.list.slice(0, 8)) {
      hourly.push({
        time: getTimeString(forecast.dt),
        weather: forecast.weather[0].main,
        temperature: Math.round(forecast.main.temp),
      });
      max = Math.max(max, forecast.main.temp_max);
      min = Math.min(min, forecast.main.temp_min);
    }
    setHourly(hourly);
    setTemperatureMax(Math.round(max));
    setTemperatureMin(Math.round(min));
    // console.log(hourly);

    // for (const thing of data.list) {
    //   console.log(thing.weather[0]);
    // }

    let dayly: DaylyWeatherInfo[] = [];
    for (let i = 0; i < data.list.length; i += 8) {
      const day = data.list.slice(i, i + 8);
      let max = Number.MIN_VALUE;
      let min = Number.MAX_VALUE;
      let worstWeather = "Clear";
      let worstDescription = "Clear sky";
      let weatherBadness = 0;
      for (const forecast of day) {
        let weather = forecast.weather[0];
        let badness = BADNESS[weather.main];
        if (badness > weatherBadness) {
          worstWeather = weather.main;
          worstDescription =
            weather.description[0].toUpperCase() + weather.description.slice(1);
          badness = weatherBadness;
        }
        max = Math.max(max, forecast.main.temp_max);
        min = Math.min(min, forecast.main.temp_min);
      }
      dayly.push({
        day:
          i == 0
            ? "Today"
            : i == 8
            ? "Tomorrow"
            : new Date(day[0].dt * 1000).toLocaleDateString(undefined, {
                weekday: "short",
              }),
        weather: worstWeather,
        description: worstDescription,
        temperatureMax: Math.round(max),
        temperatureMin: Math.round(min),
      });
    }
    setDayly(dayly);

    setLoaded(true);
  }

  navigator.geolocation.getCurrentPosition((position) => {
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&units=metric&appid=${APPID}`
    )
      .then((body) => body.json())
      .then(readCurrentData);
  });

  return (
    <Switch>
      <Match when={!loaded()}>
        <div class="Loading">
          <div class="lds-ripple">
            <div></div>
            <div></div>
          </div>
        </div>
      </Match>
      <Match when={loaded()}>
        {" "}
        <h1 class="City">{city()}</h1>
        <p class="MinMax">
          {new Date().toLocaleDateString(undefined, { weekday: "short" })}{" "}
          {temperatureMax()}° / {temperatureMin()}°
        </p>
        <div class="CurrentInfo">
          <h2 class="Temp">{temperature()}°</h2>
          <img src={ICONS[weather()]} alt={weather()} />
        </div>
        <p class="Feel">{`Feels like ${temperatureFeel()}°`}</p>
        <div class="Tabs">
          <div>
            <button
              class={isDayly() ? "" : "Selected"}
              type="button"
              onClick={() => setIsDayly(false)}
            >
              Today
            </button>
            <button
              class={isDayly() ? "Selected" : ""}
              type="button"
              onClick={() => setIsDayly(true)}
            >
              5 Days
            </button>
          </div>
        </div>
        <Show when={!isDayly()}>
          <div class="HourlyForecast">
            <div class="List">
              <For each={hourly()}>
                {(forecast) => (
                  <div class="Card">
                    <p>{forecast.time}</p>
                    <img src={ICONS[forecast.weather]} alt={forecast.weather} />
                    <p>{forecast.temperature + "°"}</p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
        <Show when={isDayly()}>
          <div class="DayForecast">
            <div class="List">
              <For each={dayly()}>
                {(forecast) => (
                  <div class="Day">
                    <div class="Container">
                      <p class="Weekday">{forecast.day}</p>
                      <img
                        class="Icon"
                        src={ICONS[forecast.weather]}
                        alt={forecast.weather}
                      ></img>
                      <div class="Description">
                        <p>{forecast.description}</p>
                      </div>
                      <p class="Temp">
                        {forecast.temperatureMax}° / {forecast.temperatureMin}°
                      </p>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
        <div class="Data">
          <div class="Cell">
            <p>Sunrise</p>
            <img src={sunriseIcon} alt="Sunrise" />
            <p>{sunriseTime()}</p>
          </div>
          <div class="Cell">
            <p>Sunset</p>
            <img src={sunsetIcon} alt="Sunset" />
            <p>{sunsetTime()}</p>
          </div>
          <div class="Cell">
            <p>Wind</p>
            <img src={tornadoIcon} alt="Wind" />
            <p>
              <strong>{windSpeed()}</strong> m/s
            </p>
          </div>
        </div>
        <footer></footer>
      </Match>
    </Switch>
  );
}

export default App;
