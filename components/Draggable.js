import React, { useState, useRef, useEffect } from "react";

Math.Deg2Rad = function(degrees) {
    return degrees * Math.PI / 180;
};

// Pixel 
export const PixelDND = ({className, id, prev_position, children}) => {
    const curRef = useRef()
    const [position, setPosition] = useState(prev_position ? prev_position : {left:0, top:0});

    return (
        <div
            ref={curRef}
            className={`${className} draggable`}
            id={id}
            style={{
                left:`${position.left}px`,
                top:`${position.top}px`,
                transform: `translateX(${position.x}px) translateY(${position.y}px)`,
            }}    
            onMouseDown={(clickEvent) => {
                const prev_left = Number(window.getComputedStyle(curRef.current).left.split('px')[0]);
                const prev_top = Number(window.getComputedStyle(curRef.current).top.split('px')[0])
                const mouseMoveHandler = (moveEvent) => {
                    const deltaX = moveEvent.screenX - clickEvent.screenX;
                    const deltaY = moveEvent.screenY - clickEvent.screenY;
                    setPosition({
                            left: prev_left + deltaX,
                            top: prev_top + deltaY,
                    });
                };

                const mouseUpHandler = () => {
                    document.removeEventListener('mousemove', mouseMoveHandler);
                };

                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler, { once: true });
            }}
        >
            {children}
        </div>
    )
}

// Percent 
export const PercentDND = ({
							className, 
							text_classname, 
							parent_size, 
							prev_size, 
							prev_position, 
							focusId, 
							onFocus, 
							focusedCanvasIndex, 
							setFocusedCanvasIndex, 
							text_pannel, 
							children, 
							gutter,
							absoluteSize,
							absolutePos,
							z_index,
						}) => {
	const [position, setPosition] = useState(prev_position ? prev_position : {x:0, y:0});
	const [size, setSize] = useState(prev_size ? prev_size : {width:0, height:0});
	const [angle, setAngle] = useState(0);
	const chartRef = useRef(null);
	useEffect(() => {
		setPosition(prev_position && !absolutePos ? prev_position : {x:0, y:0});
		setSize(prev_size ? prev_size : {width:0, height:0});
	}, [JSON.stringify(prev_position), JSON.stringify(prev_size)]);

	return (
		<div 
			tabIndex='0' // foucus for div
			ref={chartRef}
			id={`${focusId}`}
			className={`${className} dnd canvas`}
			style={{
				transform: `translateX(${position.x}px) translateY(${position.y}px) rotate(${angle}rad)`,
				width: `${size.width-(gutter??0)}${absoluteSize? 'px' : '%'}`,
				height: `${size.height-(gutter??0)}${absoluteSize? 'px' : '%'}`,
				overflow: 'visible',
				zIndex: (z_index !== undefined)? z_index : 1,
			}}
			onFocus={(e) => {
				e.stopPropagation();
				onFocus(e);
				setFocusedCanvasIndex(focusId);
			}}
			onClick={(e) => {
				// e.preventDefault();
				e.stopPropagation();
				if(focusedCanvasIndex === focusId) {
					return;
				}
				document.getElementById(`${focusId}`).focus();
			}}
		>
			<div className={'moveHandle moveHandleTop'}
				onMouseDown={(clickEvent) => {
					const mouseMoveHandler = (moveEvent) => {
						const deltaX = moveEvent.screenX - clickEvent.screenX;
						const deltaY = moveEvent.screenY - clickEvent.screenY;

						setPosition({
							x: position.x + deltaX,
							y: position.y + deltaY,
						});
					};

					const mouseUpHandler = () => {
						document.removeEventListener('mousemove', mouseMoveHandler);
					};

					document.addEventListener('mousemove', mouseMoveHandler);
					document.addEventListener('mouseup', mouseUpHandler, { once: true });
				}}
			/>
			<div className={'moveHandle moveHandleLeft'}
				onMouseDown={(clickEvent) => {
					const mouseMoveHandler = (moveEvent) => {
						const deltaX = moveEvent.screenX - clickEvent.screenX;
						const deltaY = moveEvent.screenY - clickEvent.screenY;

						setPosition({
							x: position.x + deltaX,
							y: position.y + deltaY,
						});
					};

					const mouseUpHandler = () => {
						document.removeEventListener('mousemove', mouseMoveHandler);
					};

					document.addEventListener('mousemove', mouseMoveHandler);
					document.addEventListener('mouseup', mouseUpHandler, { once: true });
				}}
			/>
			<div className={'moveHandle moveHandleRight'}
				onMouseDown={(clickEvent) => {
					const mouseMoveHandler = (moveEvent) => {
						const deltaX = moveEvent.screenX - clickEvent.screenX;
						const deltaY = moveEvent.screenY - clickEvent.screenY;

						setPosition({
							x: position.x + deltaX,
							y: position.y + deltaY,
						});
					};

					const mouseUpHandler = () => {
						document.removeEventListener('mousemove', mouseMoveHandler);
					};

					document.addEventListener('mousemove', mouseMoveHandler);
					document.addEventListener('mouseup', mouseUpHandler, { once: true });
				}}
			/>
			<div className={'moveHandle moveHandleBottom'}
				onMouseDown={(clickEvent) => {
					const mouseMoveHandler = (moveEvent) => {
						const deltaX = moveEvent.screenX - clickEvent.screenX;
						const deltaY = moveEvent.screenY - clickEvent.screenY;

						setPosition({
							x: position.x + deltaX,
							y: position.y + deltaY,
						});
					};

					const mouseUpHandler = () => {
						document.removeEventListener('mousemove', mouseMoveHandler);
					};

					document.addEventListener('mousemove', mouseMoveHandler);
					document.addEventListener('mouseup', mouseUpHandler, { once: true });
				}}
			/>
			<div className={'rotateHandle'}
					onMouseDown={(clickEvent) => {
						document.body.style.cursor = 'grabbing';
						clickEvent.stopPropagation();
						const centerX = chartRef.current.getBoundingClientRect().left + chartRef.current.offsetWidth / 2
						const centerY = chartRef.current.getBoundingClientRect().top + chartRef.current.offsetHeight/ 2
						const mouseMoveHandler = (moveEvent) => {
							const deltaX = moveEvent.clientX - centerX;
							const deltaY = moveEvent.clientY - centerY;

							setAngle(Math.atan2(deltaY, deltaX) + Math.Deg2Rad(45) );
						};
		
						const mouseUpHandler = () => {
							document.removeEventListener('mousemove', mouseMoveHandler);
							document.body.style.cursor = 'auto';
						};
		
						document.addEventListener('mousemove', mouseMoveHandler);
						document.addEventListener('mouseup', mouseUpHandler, { once: true });
				}}
			/>
			<div className={'resizeHandle'}
					onMouseDown={(clickEvent) => {
						clickEvent.stopPropagation();
						const mouseMoveHandler = (moveEvent) => {
							const deltaX = moveEvent.screenX - clickEvent.screenX;
							const deltaY = moveEvent.screenY - clickEvent.screenY;
		
							setSize({
									width: size.width + deltaX/parent_size.width*100,
									height: size.height + deltaY/parent_size.height*100
							});
						};
		
						const mouseUpHandler = () => {
							document.removeEventListener('mousemove', mouseMoveHandler);
						};
		
						document.addEventListener('mousemove', mouseMoveHandler);
						document.addEventListener('mouseup', mouseUpHandler, { once: true });
				}}
			/>
			{children}
    	</div>
)};