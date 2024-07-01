// import * as d3 from 'd3';
import * as d3 from 'd3';
import * as d3HSV from 'd3-hsv';


export class Color {
    constructor() {
        this.n = 0;
        this.name2Id = {};
        this.id2Color = [];
    }

    setN(n) {
        this.n = n;
        this.name2Id = {};
        this.id2Color = [];
    }

    addElement(x) {
        if(this.name2Id[x] === undefined) {
            this.name2Id[x] = this.id2Color.length;
            this.id2Color.push(d3.interpolateRainbow(0));
        }
        for(let i = 0; i < this.id2Color.length; i++) {
            const c = d3.interpolateRainbow(i / this.n);
            this.id2Color[i] = d3HSV.hsv(c).darker(0.4);
        }
    }

    getColor(x) {
        const id = this.name2Id[x];
        return this.id2Color[id];
    }
}