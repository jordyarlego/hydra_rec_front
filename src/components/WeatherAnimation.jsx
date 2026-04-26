import React, { useMemo } from 'react';

export default function WeatherAnimation({ bgKey }) {
  // useMemo garante posições estáveis — sem re-randomizar a cada re-render do pai
  const rainDrops = useMemo(() =>
    Array.from({ length: 60 }).map(() => ({
      left:     `${Math.random() * 100}%`,
      duration: `${0.5 + Math.random() * 0.5}s`,
      delay:    `${Math.random() * 2}s`,
    })), []);

  const stars = useMemo(() =>
    Array.from({ length: 30 }).map(() => ({
      left:     `${Math.random() * 100}%`,
      top:      `${Math.random() * 100}%`,
      duration: `${2 + Math.random() * 3}s`,
      delay:    `${Math.random() * 2}s`,
    })), []);

  if (bgKey === 'rain') {
    return (
      <div className="weather-fx rain-fx">
        {rainDrops.map((drop, i) => (
          <div
            key={i}
            className="drop"
            style={{
              left:              drop.left,
              animationDuration: drop.duration,
              animationDelay:    drop.delay,
            }}
          />
        ))}
      </div>
    );
  }

  if (bgKey === 'clouds') {
    return (
      <div className="weather-fx clouds-fx">
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
      </div>
    );
  }

  if (bgKey === 'sun') {
    return (
      <div className="weather-fx sun-fx">
        <div className="sun-ray r1" />
        <div className="sun-ray r2" />
      </div>
    );
  }

  if (bgKey === 'night') {
    return (
      <div className="weather-fx night-fx">
        {stars.map((star, i) => (
          <div
            key={i}
            className="star"
            style={{
              left:              star.left,
              top:               star.top,
              animationDuration: star.duration,
              animationDelay:    star.delay,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}
