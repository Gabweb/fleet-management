/**
 * // fleet manager process cpu profile
 * top -b -d 2 -p 2305654 | awk \
    -v cpuLog="./fm.cpu.log" -v pid="2305654" -v pname="fm" '
    /^top -/{time = $3}
    $1+0>0 {printf "%s %s :: %s[%s] CPU Usage: %d%%\n", \
            strftime("%Y-%m-%d"), time, pname, pid, $9 > cpuLog
            fflush(cpuLog)}'
    // zitadel, pg container stats
    while true; do
        docker stats zitadel --no-stream --format "{{ json . }}" >> ./zitadel.stats.txt
        docker stats postgresql-zitadel --no-stream --format "{{ json . }}" >> ./pg.stats.txt
        echo "stats collect"
        sleep 1
    done

 */
const {readFile} = require('fs').promises;
const unitMultiplier = {
    '%': 1,
    kib: 1024,
    mib: 1024 * 1024,
    gib: 1024 * 1024 * 1024
};
function extractNumeric(str, strOrigin) {
    const test = str.slice(-1);
    if (isNaN(parseInt(test))) {
        return extractNumeric(str.slice(0, -1), strOrigin);
    }
    const unit = strOrigin.split(str)[1].trim().toLowerCase();
    return parseFloat(str) * unitMultiplier[unit];
}
function dockerStatsClean({
    CPUPerc,
    MemUsage,
    NetIO
}) {
    const cpu = extractNumeric(CPUPerc, CPUPerc);
    const mem = extractNumeric(MemUsage, MemUsage);
    const net = NetIO.split('/')[0].trim();
    return {cpu, mem, net};
};

const transform = (a, c, idx) => {
    const r = dockerStatsClean(JSON.parse(c));
    a.cpu.count = idx + 1;
    a.mem.count = idx + 1;
    a.cpu.sum = a.cpu.sum + r.cpu;
    a.mem.sum = a.mem.sum + r.mem;
    a.net.last = r.net;

    a.cpu.avg = a.cpu.sum / a.cpu.count;
    a.mem.avg = a.mem.sum / a.mem.count;
    return a;
};

(async() => {
    const zitadel = (await readFile('./zitadel.stats.txt'))
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .reduce(transform, {cpu: {sum: 0, count: 0}, mem: {sum: 0, count: 0}, net: {last: 0}});
    const pg = (await readFile('./pg.stats.txt'))
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .reduce(transform, {cpu: {sum: 0, count: 0}, mem: {sum: 0, count: 0}, net: {last: 0}});
    const fm = (await readFile('./fm.cpu.log'))
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .map((v) => parseFloat(v.split(':')[5].trim().slice(0, -1)));
    console.log([
        {process: 'zitadel', ...zitadel}
        ,{process: 'pg', ...pg}
        ,{process: 'fm', ...{cpu: {avg: fm.reduce((t, c) => (t + c), 0) / fm.length}}}
    ]);
})();