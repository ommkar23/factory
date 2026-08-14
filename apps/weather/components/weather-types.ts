export type Location = {
  id: string;
  name: string;
  region: string;
};

export type CurrentConditions = {
  condition: "Clear" | "Cloudy" | "Light rain";
  feelsLike: string;
  humidity: string;
  localObservationTime: string;
  precipitation: string;
  temperature: string;
  wind: string;
};
