import { formatTimestamp } from './log-utils.js';
import { TRAVEL_ACTION_CONFIG } from './TravelActionConfig.js';

export function TravelEntry({ entry }) {
  const config = TRAVEL_ACTION_CONFIG[entry.action] || TRAVEL_ACTION_CONFIG.advance;
  const hexStr = entry.hex ? `(${entry.hex.q}, ${entry.hex.r})` : '';

  return (
    <div className="log-entry log-travel" style={{ borderLeftColor: config.color }}>
      <div className="log-entry-header">
        <span className="log-icon" style={{ color: config.color }}>
          <i className={`fas ${config.icon}`}></i>
        </span>
        <span className="log-travel-action" style={{ color: config.color }}>
          {config.label}
        </span>
        {hexStr && <span className="log-travel-coords">{hexStr}</span>}
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-travel-details">
        {entry.terrain && (
          <span className="log-travel-terrain">
            <i className="fas fa-mountain"></i> {entry.terrain}
          </span>
        )}
        {entry.weather && (
          <span className="log-travel-weather">
            <i className={`fas fa-${entry.weatherIcon || 'sun'}`}></i> {entry.weather}
          </span>
        )}
      </div>
      {entry.eventTitle && (
        <div className="log-travel-event">
          <span className="log-travel-event-type">{entry.eventType}</span>
          <span className="log-travel-event-title">{entry.eventTitle}</span>
        </div>
      )}
    </div>
  );
}
