/* eslint-disable react/prop-types */
import React from 'react'
import './hidden-input.css'

function HiddenInput({ handleInputToggle, handleValueChange, showInput, value }) {
    const inputRef = React.useRef(null);
    React.useEffect(() => {
        if(showInput) {
            inputRef.current.focus();
        }
    }, [showInput]);

    const handleChange = (event) => {
        handleValueChange(event.target.value);
    };
    const handleKeyDown = (event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
            handleChange(event);
            handleInputToggle();
        }
    };
    const handleStopPropagation = (event) => {
        event.stopPropagation();
    };

    return (
        <span className='clickable'>
            {
                showInput ? (
                    <input
                        min="0"
                        onBlur={handleInputToggle}
                        onChange={handleChange}
                        onClick={handleStopPropagation}
                        onKeyDown={handleKeyDown}
                        ref={inputRef}
                        type="number"
                        value={value}
                    />
                ) : (
                    value
                )
            }
        </span>
    )
}

export default HiddenInput
