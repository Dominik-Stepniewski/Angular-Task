import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { LineDataset } from './chart-data';

const WIDTH = 800;
const HEIGHT = 360;
const BG = '#14181A';
const INK = '#E6EDEF';
const MUTED = '#7C8A90';
const AMBER = '#FFC24B';
const CYAN = '#4BD6E0';

const canvas = new ChartJSNodeCanvas({ width: WIDTH, height: HEIGHT, backgroundColour: BG });

const PALETTE = [AMBER, CYAN, '#8B9AFF', '#4ADE80'];

export function renderLine(labels: string[], datasets: LineDataset[]): Promise<Buffer> {
  return canvas.renderToBuffer({
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: d.data,
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: PALETTE[i % PALETTE.length],
        tension: 0.25,
      })),
    },
    options: {
      plugins: { legend: { labels: { color: INK } } },
      scales: {
        x: { ticks: { color: MUTED } },
        y: { ticks: { color: MUTED }, beginAtZero: true },
      },
    },
  });
}

export function renderBar(labels: string[], data: number[]): Promise<Buffer> {
  return canvas.renderToBuffer({
    type: 'bar',
    data: { labels, datasets: [{ label: 'actions', data, backgroundColor: AMBER }] },
    options: {
      plugins: { legend: { labels: { color: INK } } },
      scales: {
        x: { ticks: { color: MUTED } },
        y: { ticks: { color: MUTED }, beginAtZero: true },
      },
    },
  });
}
