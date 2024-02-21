const express = require('express');
const app = express();
const axios = require('axios');
const cors = require('cors');
const jsonData = require('./cities.json');
const fs = require('fs');
const Papa = require('papaparse');
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors())

const csvDataCountries = fs.readFileSync('german-iso-3166.csv', 'utf-8')
const csvDataCities = fs.readFileSync('geonames-all-cities-with-a-population-500.csv', 'utf-8')

let countriesCSV = []
let citiesCSV = []
let citiesJoined = []

const innerjoinCityCountry = (cities, countries) => {
  const result = [];
  for (let i in cities) {
    for (let j in countries) {
      if (cities[i].CountryCode === countries[j].Code) {
        cities[i].CountryGerman = countries[j].Land
        result.push(cities[i]);
      }
    }
  }
  return result;
}

// Fetch CSV file using the fetch API
const readCSVdata = () => {
  Papa.parse(csvDataCountries, {
    header: true, // Set to true if your CSV has a header row
    complete: function (results) {
      // Access the parsed data in the 'results.data' array
      countriesCSV = results.data
    },
    error: function (error) {
      console.error('Error parsing CSV:', error.message);
    }
  });

  Papa.parse(csvDataCities, {
    header: true, // Set to true if your CSV has a header row
    complete: function (results) {
      // Access the parsed data in the 'results.data' array
      citiesCSV = results.data
    },
    error: function (error) {
      console.error('Error parsing CSV:', error.message);
    }
  });

  citiesJoined = innerjoinCityCountry(citiesCSV, countriesCSV)
  citiesJoined = citiesJoined.sort((a, b) => parseFloat(b.Population) - parseFloat(a.Population))
}


// Routes
app.get('/', (req, res) => {
  res.send(citiesJoined)
});


app.get('/:city/:country', (req, res) => {
  let city = req.params.city
  let countryGerman = req.params.country
  let countryEnglish = null
  let asciiName = null
  let countryCode = null
  let population = null
  let timezone = null
  let latitude = null
  let longitude = null
  let coordinates = []
  for (let i in citiesJoined) {
    if (
      city.toLowerCase() === citiesJoined[i].Name.toLowerCase()
      && countryGerman.toLocaleLowerCase() === citiesJoined[i].CountryGerman.toLocaleLowerCase()) {
      countryEnglish = citiesJoined[i].Country
      countryGerman = citiesJoined[i].CountryGerman
      asciiName = citiesJoined[i].ASCIIName
      countryCode = citiesJoined[i].CountryCode
      population = citiesJoined[i].Population
      timezone = citiesJoined[i].Timezone
      latitude = citiesJoined[i].Latitude
      longitude = citiesJoined[i].Longitude
      coordinates = citiesJoined[i].Coordinates.split(', ')
    }
  }

  axios.get(`https://timeapi.io/api/TimeZone/zone?timeZone=${timezone}`)
    .then(response => {
      // Use the result from the first URL
      console.log(response.data.currentUtcOffset)
      let data = response.data;
      if (data.currentUtcOffset) {
        data.currentUtcOffset = {
          hours: data.currentUtcOffset.seconds / 3600,
          minutes: data.currentUtcOffset.seconds / 60
        }
      }
      if (data.standardUtcOffset) {
        data.standardUtcOffset = {
          hours: data.standardUtcOffset.seconds / 3600,
          minutes: data.standardUtcOffset.seconds / 60
        }
      }
      if (data.dstInterval && data.dstInterval.dstOffsetToUtc) {
        data.dstInterval.dstOffsetToUtc = {
          hours: data.dstInterval.dstOffsetToUtc.seconds / 3600,
          minutes: data.dstInterval.dstOffsetToUtc.seconds / 60
        }
      }
      if (data.dstInterval && data.dstInterval.dstOffsetToStandardTime) {
        data.dstInterval.dstOffsetToStandardTime = {
          hours: data.dstInterval.dstOffsetToStandardTime.seconds / 3600,
          minutes: data.dstInterval.dstOffsetToStandardTime.seconds / 60
        }
      }
      if (data.dstInterval && data.dstInterval.dstDuration) {
        data.dstInterval.dstDuration = {
          days: data.dstInterval.dstDuration.days
        }
      }
      data.city = city
      data.asciiName = asciiName
      data.countryGerman = countryGerman
      data.countryEnglish = countryEnglish
      data.countryCode = countryCode
      data.population = population
      data.timezone = timezone
      data.latitude = latitude
      data.longitude = longitude
      data.coordinates = coordinates

      // Send the data as a response or process it further
      res.json({ data });
    })
    .catch(error => {
      // Handle errors
      console.error('Error:', error.message);
    });
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
  readCSVdata()
});
