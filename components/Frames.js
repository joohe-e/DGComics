import styles from '../styles/Graphcomic.module.css';
import { GraphDND } from './GraphDND';
import React, { memo, Suspense, use, useEffect, useRef, useState } from 'react';

export const Frames = ({
                width,
                height,
                data_name, 
                graphList, 
                setGraphList, 
                focusedCanvasIndex, 
                setFocusedCanvasIndex, 
                setCurrentGraphId, 
                mode, 
                mainCharacter,
                thumbnails,
                setThumbnails,
                isBrush,
                supporter,
                highlight,
                supportCandidate,
                setSupportCandidate,
                setCurrentSupporter,
                initialPos,
                classes,
                linkClasses,
                setLinkClasses,
                posState, 
                setPosState, 
                color,
                canvasList,
                setSupporter,
                setHighlight,
                threshold,
                freshGenerate,
            }) => {

    return <div className={styles.canvas} id='ComicCanvas'>
        {(graphList.length > 0) ?
            graphList.map((graph, index) => {
                const comp = (
                    <GraphDND 
                            freshGenerate={freshGenerate}
                            width={width}
                            height={height}
                            data_name={data_name}
                            key={index}  // Added key prop here
                            graph={graph}
                            // graphList={graphList}
                            // setGraphList={setGraphList}
                            mode={mode}
                            size={graph.size}
                            focusId={graph.index}
                            focusedCanvasIndex={focusedCanvasIndex}
                            setFocusedCanvasIndex={setFocusedCanvasIndex}
                            setCurrentGraphId={setCurrentGraphId}
                            // mainCharacter={mainCharacter[parseInt(graph.full_graph.from)]}
                            mainCharacter={mainCharacter[graph.range]}
                            thumbnails={thumbnails}
                            setThumbnails={setThumbnails}
                            isBrush={isBrush}
                            supporter={supporter}
                            highlight={highlight}
                            supportCandidate={supportCandidate}
                            setSupportCandidate={setSupportCandidate}
                            setCurrentSupporter={setCurrentSupporter}
                            pos={initialPos}
                            classes={classes}
                            linkClasses={linkClasses}
                            setLinkClasses={setLinkClasses}
                            posState={posState}
                            setPosState={setPosState}
                            color={color}
                            gutter={1}
                            setSupporter={setSupporter}
                            setHighlight={setHighlight}
                            threshold={threshold}
                    />
                );
                if(index === graphList.length - 1) {
                    freshGenerate.current = false;
                }
                return comp;
            }) : null
        }
        {canvasList.map(item => {return item})}
    </div>

};
