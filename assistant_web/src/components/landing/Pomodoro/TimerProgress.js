import React from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

const TimerProgress = ({ key, isPlaying, duration, colors }) => {
  console.log({ key, isPlaying, duration, colors })
  return (
    <CountdownCircleTimer
      key={key}
      isPlaying
      duration={duration}
      colors={colors}
      strokeWidth={6}
      strokeLinecap="round"
      size={200}
      trailColor="#F0F0F0"
    >
      {({ remainingTime }) => <div>{remainingTime}</div>}
    </CountdownCircleTimer>
  );
};

export default TimerProgress;
