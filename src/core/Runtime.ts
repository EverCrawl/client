
let raf: number;
export function start(
    update: () => void,
    render: (t: number) => void,
    MS_PER_UPDATE: number
) {
    let last = window.performance.now();
    let lag = 0.0;
    const loop = (now: number) => {
        let dt = now - last;
        last = now;

        lag += dt;
        while (lag >= MS_PER_UPDATE) {
            update();
            lag -= MS_PER_UPDATE;
        }

        render(lag / MS_PER_UPDATE);
        raf = window.requestAnimationFrame(loop);
    }
    raf = window.requestAnimationFrame(loop);
}
export function stop() {
    if (raf) {
        window.cancelAnimationFrame(raf);
    }
}

/* let rafHandle = -1;
export abstract class Runtime {
    static Start(
        update?: () => void,
        render?: (t: number) => void,
        rate: number = 60,
        maxConsecutiveUpdates: number = 5,
    ) {
        const getTime = Date.now;
        const update_time_delta = 1000 / rate;
        let next_game_tick = getTime();

        const _update = update ?? function () { };
        const _render = render ?? function () { };

        let last = getTime();
        const loop = () => {
            const now = getTime();
            let processed_update_count = 0;
            while (now > next_game_tick && processed_update_count++ < maxConsecutiveUpdates) {
                _update();
                next_game_tick += update_time_delta;
            }
            _render((now - last));
            last = now;
            rafHandle = window.requestAnimationFrame(loop);
        }

        rafHandle = window.requestAnimationFrame(loop);
    }

    static Stop() {
        if (rafHandle === -1) return;
        window.cancelAnimationFrame(rafHandle);
    }
} */