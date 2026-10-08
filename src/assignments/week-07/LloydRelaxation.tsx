import { useEffect, useRef, useState } from 'react';
import { Delaunay } from 'd3-delaunay';
import { select } from 'd3-selection';

interface Point {
  x: number;
  y: number;
}

const WIDTH = 700;
const HEIGHT = 500;

const NUM_POINTS = 180;

const PADDING = 0;

const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

const INITIAL_RADIUS = 65;

/*
 * Each Lloyd iteration lasts this amount
 */
const ITERATION_DURATION = 50;

/*
 * How far each point moves toward the centroid
 * during each Lloyd iteration.
 *
 * 1.0 = full movement to the centroid
 * 0.8 = slightly smoother relaxation
 */
const RELAXATION_FACTOR = 0.8;

export function LloydRelaxation() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  /*
   * Store the current point positions in a ref rather
   * than React state because the points are updated
   * on every animation frame.
   */
  const pointsRef = useRef<Point[]>([]);

  /*
   * Keep track of the current animation frame so that
   * it can be cancelled when Stop or Reset is pressed.
   */
  const animationFrameRef = useRef<number | null>(null);

  /*
   * Keep the running state in a ref as well.
   *
   * The animation callback is asynchronous, so using
   * a ref allows it to always see the current value.
   */
  const runningRef = useRef(false);

  const [iteration, setIteration] = useState(0);
  const [running, setRunning] = useState(false);

  /*
   * ---------------------------------------------------------
   * Generate initial points
   * ---------------------------------------------------------
   *
   * The points start clustered around the center.
   *
   * A minimum distance prevents multiple points from being
   * generated almost directly on top of one another, which
   * can cause unstable/flickering Voronoi cells.
   */
  const generateInitialPoints = (): Point[] => {
    const points: Point[] = [];

    const minimumDistance = 4;

    let attempts = 0;

    const maxAttempts = NUM_POINTS * 100;

    while (points.length < NUM_POINTS && attempts < maxAttempts) {
      attempts++;

      const angle = Math.random() * Math.PI * 2;

      const radius = Math.pow(Math.random(), 2.8) * INITIAL_RADIUS;

      const candidate: Point = {
        x: CENTER_X + Math.cos(angle) * radius,

        y: CENTER_Y + Math.sin(angle) * radius,
      };

      /*
       * Make sure the new point isn't too close
       * to an existing point.
       */
      const isTooClose = points.some((point) => {
        const dx = point.x - candidate.x;

        const dy = point.y - candidate.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < minimumDistance;
      });

      if (!isTooClose) {
        points.push(candidate);
      }
    }

    return points;
  };

  /*
   * ---------------------------------------------------------
   * Calculate the centroid of a polygon
   * ---------------------------------------------------------
   */
  const polygonCentroid = (polygon: [number, number][]): Point => {
    if (polygon.length === 0) {
      return {
        x: CENTER_X,
        y: CENTER_Y,
      };
    }

    let area = 0;
    let centroidX = 0;
    let centroidY = 0;

    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i];

      const next = polygon[(i + 1) % polygon.length];

      const cross = current[0] * next[1] - next[0] * current[1];

      area += cross;

      centroidX += (current[0] + next[0]) * cross;

      centroidY += (current[1] + next[1]) * cross;
    }

    area /= 2;

    /*
     * Handle degenerate polygons.
     */
    if (Math.abs(area) < 0.0001) {
      return {
        x: polygon[0][0],
        y: polygon[0][1],
      };
    }

    return {
      x: centroidX / (6 * area),
      y: centroidY / (6 * area),
    };
  };

  /*
   * ---------------------------------------------------------
   * Calculate the next Lloyd iteration
   * ---------------------------------------------------------
   */
  const calculateNextIteration = (currentPoints: Point[]): Point[] => {
    const delaunay = Delaunay.from(
      currentPoints,
      (d) => d.x,
      (d) => d.y,
    );

    const voronoi = delaunay.voronoi([PADDING, PADDING, WIDTH - PADDING, HEIGHT - PADDING]);

    return currentPoints.map((point, i) => {
      const polygon = voronoi.cellPolygon(i);

      /*
       * If a cell cannot be generated,
       * leave the point where it is.
       */
      if (!polygon) {
        return point;
      }

      const centroid = polygonCentroid(polygon as [number, number][]);

      /*
       * Move toward the centroid rather than
       * jumping all the way there.
       */
      return {
        x: point.x + (centroid.x - point.x) * RELAXATION_FACTOR,

        y: point.y + (centroid.y - point.y) * RELAXATION_FACTOR,
      };
    });
  };

  /*
   * ---------------------------------------------------------
   * Draw the Voronoi diagram
   * ---------------------------------------------------------
   *
   * This is called on every animation frame.
   * Because the diagram is recalculated from the
   * intermediate point positions, the cell boundaries
   * continuously move as the points move.
   */
  const draw = (points: Point[]) => {
    if (!svgRef.current) {
      return;
    }

    const svg = select(svgRef.current);

    const delaunay = Delaunay.from(
      points,
      (d) => d.x,
      (d) => d.y,
    );

    const voronoi = delaunay.voronoi([PADDING, PADDING, WIDTH - PADDING, HEIGHT - PADDING]);

    const cells = svg
      .select<SVGGElement>('.cells')
      .selectAll<SVGPathElement, number>('path')
      .data(
        points.map((_, i) => i),
        (d) => String(d),
      );

    /*
     * Create the cells.
     */
    cells
      .enter()
      .append('path')
      .attr('class', 'cell')
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.8);

    /*
     * Update the cell paths.
     */
    svg
      .select<SVGGElement>('.cells')
      .selectAll<SVGPathElement, number>('path')
      .attr('d', (i) => {
        const polygon = voronoi.cellPolygon(i);

        if (!polygon) {
          return '';
        }

        return 'M' + polygon.map(([x, y]) => `${x},${y}`).join('L') + 'Z';
      });
  };

  /*
   * ---------------------------------------------------------
   * Continuous animation
   * ---------------------------------------------------------
   *
   * Unlike the previous version, this does NOT have
   * separate animation functions for each iteration.
   *
   * There is one continuous animation loop.
   */
  const animateIteration = () => {
    if (!runningRef.current) {
      return;
    }

    /*
     * Points at the beginning of the current iteration.
     */
    let startingPoints = pointsRef.current;

    /*
     * Calculate where those points should move.
     */
    let targetPoints = calculateNextIteration(startingPoints);

    /*
     * Track the previous animation frame.
     */
    let previousTime = performance.now();

    /*
     * How far into the current iteration
     * we currently are.
     */
    let iterationElapsed = 0;

    const animate = (currentTime: number) => {
      /*
       * Stop immediately if the user pressed Stop.
       */
      if (!runningRef.current) {
        return;
      }

      /*
       * Calculate the time since the previous frame.
       */
      const deltaTime = currentTime - previousTime;

      previousTime = currentTime;

      iterationElapsed += deltaTime;

      /*
       * If we have reached the end of an iteration,
       * immediately begin calculating the next one.
       *
       * There is intentionally NO pause here.
       */
      while (iterationElapsed >= ITERATION_DURATION) {
        iterationElapsed -= ITERATION_DURATION;

        /*
         * The previous target becomes the starting
         * point for the next iteration.
         */
        startingPoints = targetPoints;

        pointsRef.current = startingPoints;

        /*
         * Calculate the next Lloyd relaxation.
         */
        targetPoints = calculateNextIteration(startingPoints);

        /*
         * Update the iteration counter.
         */
        setIteration((previous) => previous + 1);
      }

      /*
       * Calculate how far through the current
       * iteration we are.
       *
       * This will always be between 0 and 1.
       */
      const progress = iterationElapsed / ITERATION_DURATION;

      /*
       * Smooth ease-in-out.
       *
       * The animation starts slowly, speeds up in
       * the middle, and slows down toward the next
       * iteration.
       */
      const eased =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      /*
       * Interpolate every point between its starting
       * position and its target position.
       */
      const interpolatedPoints = startingPoints.map((start, i) => {
        const target = targetPoints[i];

        return {
          x: start.x + (target.x - start.x) * eased,

          y: start.y + (target.y - start.y) * eased,
        };
      });

      /*
       * Store the current positions.
       */
      pointsRef.current = interpolatedPoints;

      /*
       * Recalculate the Voronoi diagram from the
       * interpolated positions.
       */
      draw(interpolatedPoints);

      /*
       * Immediately request the next frame.
       */
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  /*
   * ---------------------------------------------------------
   * Start
   * ---------------------------------------------------------
   */
  const handleStart = () => {
    /*
     * Don't accidentally start multiple animation
     * loops if Start is clicked more than once.
     */
    if (runningRef.current) {
      return;
    }

    runningRef.current = true;

    setRunning(true);

    animateIteration();
  };

  /*
   * ---------------------------------------------------------
   * Stop
   * ---------------------------------------------------------
   */
  const handleStop = () => {
    runningRef.current = false;

    setRunning(false);

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);

      animationFrameRef.current = null;
    }
  };

  /*
   * ---------------------------------------------------------
   * Reset
   * ---------------------------------------------------------
   */
  const handleReset = () => {
    /*
     * Stop the animation first.
     */
    handleStop();

    /*
     * Generate a completely new initial
     * configuration.
     */
    const initialPoints = generateInitialPoints();

    pointsRef.current = initialPoints;

    setIteration(0);

    /*
     * Immediately display iteration 0.
     */
    draw(initialPoints);
  };

  /*
   * ---------------------------------------------------------
   * Initial setup
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const initialPoints = generateInitialPoints();

    pointsRef.current = initialPoints;

    draw(initialPoints);

    return () => {
      runningRef.current = false;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    // Initialize only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <button type="button" onClick={handleStart} disabled={running}>
          Start
        </button>

        <button type="button" onClick={handleStop} disabled={!running}>
          Stop
        </button>

        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        style={{
          maxWidth: `${WIDTH}px`,
          height: 'auto',
          background: '#7d7fae',
        }}
      >
        <g className="cells" />
      </svg>

      <span>Iteration: {iteration}</span>
    </div>
  );
}
