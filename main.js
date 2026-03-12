const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function timeToSeconds(timeStr) {
        let [time, modifier] = timeStr.split(" ");
        let [hours, minutes, seconds] = time.split(":").map(Number);

        if (modifier === "pm" && hours !== 12) {
            hours += 12;
        }

        if (modifier === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);
    let diff = end - start;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function timeToSeconds(timeStr) {
        let [time, modifier] = timeStr.split(" ");
        let [hours, minutes, seconds] = time.split(":").map(Number);

        if (modifier === "pm" && hours !== 12) {
            hours += 12;
        }

        if (modifier === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToDuration(totalSeconds) {
        let h = Math.floor(totalSeconds / 3600);
        let m = Math.floor((totalSeconds % 3600) / 60);
        let s = totalSeconds % 60;

        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);

    let workStart = timeToSeconds("8:00:00 am");
    let workEnd = timeToSeconds("10:00:00 pm");

    let idleSeconds = 0;

    if (start < workStart) {
        idleSeconds += workStart - start;
    }

    if (end > workEnd) {
        idleSeconds += end - workEnd;
    }

    return secondsToDuration(idleSeconds);
}
// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function durationToSeconds(durationStr) {
        let [hours, minutes, seconds] = durationStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToDuration(totalSeconds) {
        let h = Math.floor(totalSeconds / 3600);
        let m = Math.floor((totalSeconds % 3600) / 60);
        let s = totalSeconds % 60;

        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    let shiftSeconds = durationToSeconds(shiftDuration);
    let idleSeconds = durationToSeconds(idleTime);

    let activeSeconds = shiftSeconds - idleSeconds;

    return secondsToDuration(activeSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function durationToSeconds(durationStr) {
        let [hours, minutes, seconds] = durationStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    let normalQuota = durationToSeconds("8:24:00");
    let eidQuota = durationToSeconds("6:00:00");
    let activeSeconds = durationToSeconds(activeTime);

    let eidStart = "2025-04-10";
    let eidEnd = "2025-04-30";

    let requiredQuota;

    if (date >= eidStart && date <= eidEnd) {
        requiredQuota = eidQuota;
    } else {
        requiredQuota = normalQuota;
    }

    return activeSeconds >= requiredQuota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let content = fs.readFileSync(textFile, "utf8");

    let lines = content.trim() === "" ? [] : content.trim().split("\n");

    let records = lines.map(line => {
        let parts = line.split(",");

        return {
            driverID: parts[0].trim(),
            driverName: parts[1].trim(),
            date: parts[2].trim(),
            startTime: parts[3].trim(),
            endTime: parts[4].trim(),
            shiftDuration: parts[5].trim(),
            idleTime: parts[6].trim(),
            activeTime: parts[7].trim(),
            metQuota: parts[8].trim() === "true",
            hasBonus: parts[9].trim() === "true"
        };
    });

    for (let i = 0; i < records.length; i++) {
        if (
            records[i].driverID === shiftObj.driverID &&
            records[i].date === shiftObj.date
        ) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: false
    };

    let insertIndex = records.length;

    for (let i = 0; i < records.length; i++) {
        if (records[i].driverID === shiftObj.driverID) {
            insertIndex = i + 1;
        }
    }

    records.splice(insertIndex, 0, newRecord);

    let updatedText = records.map(record => {
        return [
            record.driverID,
            record.driverName,
            record.date,
            record.startTime,
            record.endTime,
            record.shiftDuration,
            record.idleTime,
            record.activeTime,
            record.metQuota,
            record.hasBonus
        ].join(",");
    }).join("\n");

    fs.writeFileSync(textFile, updatedText);

    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let content = fs.readFileSync(textFile, "utf8");

    let lines = content
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    let updatedLines = lines.map(line => {
        let parts = line.split(",");

        let currentDriverID = parts[0].trim();
        let currentDate = parts[2].trim();

        if (currentDriverID === driverID && currentDate === date) {
            parts[9] = String(newValue);
        }

        return parts.join(",");
    });

    fs.writeFileSync(textFile, updatedLines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");

    let lines = content
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    let targetMonth = String(month).padStart(2, "0");
    let driverExists = false;
    let count = 0;

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        let currentDriverID = parts[0].trim();
        let currentDate = parts[2].trim();   
        let hasBonus = parts[9].trim() === "true";

        if (currentDriverID === driverID) {
            driverExists = true;

            let recordMonth = currentDate.split("-")[1]; 

            if (recordMonth === targetMonth && hasBonus) {
                count++;
            }
        }
    }

    if (!driverExists) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    let content = fs.readFileSync(textFile, "utf8");

    let lines = content
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    let totalSeconds = 0;

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        let currentDriverID = parts[0].trim();
        let currentDate = parts[2].trim();  
        let activeTime = parts[7].trim();    

        let recordMonth = Number(currentDate.split("-")[1]);

        if (currentDriverID === driverID && recordMonth === month) {
            let timeParts = activeTime.split(":").map(Number);
            let hours = timeParts[0];
            let minutes = timeParts[1];
            let seconds = timeParts[2];

            totalSeconds += hours * 3600 + minutes * 60 + seconds;
        }
    }

    let totalHours = Math.floor(totalSeconds / 3600);
    let totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    let totalRemainingSeconds = totalSeconds % 60;

    return `${totalHours}:${totalMinutes.toString().padStart(2, "0")}:${totalRemainingSeconds.toString().padStart(2, "0")}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    function durationToSeconds(durationStr) {
        let [hours, minutes, seconds] = durationStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToDuration(totalSeconds) {
        let h = Math.floor(totalSeconds / 3600);
        let m = Math.floor((totalSeconds % 3600) / 60);
        let s = totalSeconds % 60;

        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

   function getDayName(dateStr) {
    let [year, month, day] = dateStr.split("-").map(Number);
    let date = new Date(year, month - 1, day);
    let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
}

    let shiftsContent = fs.readFileSync(textFile, "utf8");
    let ratesContent = fs.readFileSync(rateFile, "utf8");

    let shiftLines = shiftsContent
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    let rateLines = ratesContent
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    let dayOff = "";

    for (let i = 0; i < rateLines.length; i++) {
        let parts = rateLines[i].split(",");
        if (parts[0].trim() === driverID) {
            dayOff = parts[1].trim();
            break;
        }
    }

    let totalRequiredSeconds = 0;

    for (let i = 0; i < shiftLines.length; i++) {
        let parts = shiftLines[i].split(",");

        let currentDriverID = parts[0].trim();
        let currentDate = parts[2].trim(); // yyyy-mm-dd
        let recordMonth = Number(currentDate.split("-")[1]);

        if (currentDriverID === driverID && recordMonth === month) {
            let currentDayName = getDayName(currentDate);

            if (currentDayName !== dayOff) {
                let dailyQuota;

                if (currentDate >= "2025-04-10" && currentDate <= "2025-04-30") {
                    dailyQuota = "6:00:00";
                } else {
                    dailyQuota = "8:24:00";
                }

                totalRequiredSeconds += durationToSeconds(dailyQuota);
            }
        }
    }

    totalRequiredSeconds -= bonusCount * 2 * 3600;

    if (totalRequiredSeconds < 0) {
        totalRequiredSeconds = 0;
    }

    return secondsToDuration(totalRequiredSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    function durationToSeconds(durationStr) {
        let [hours, minutes, seconds] = durationStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    let content = fs.readFileSync(rateFile, "utf8");

    let lines = content
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        if (parts[0].trim() === driverID) {
            basePay = Number(parts[2].trim());
            tier = Number(parts[3].trim());
            break;
        }
    }

    let actualSeconds = durationToSeconds(actualHours);
    let requiredSeconds = durationToSeconds(requiredHours);

    if (actualSeconds >= requiredSeconds) {
        return basePay;
    }

    let missingSeconds = requiredSeconds - actualSeconds;
    let allowedMissingHours = 0;

    if (tier === 1) {
        allowedMissingHours = 50;
    } else if (tier === 2) {
        allowedMissingHours = 20;
    } else if (tier === 3) {
        allowedMissingHours = 10;
    } else if (tier === 4) {
        allowedMissingHours = 3;
    }

    let allowedMissingSeconds = allowedMissingHours * 3600;
    let remainingMissingSeconds = missingSeconds - allowedMissingSeconds;

    if (remainingMissingSeconds <= 0) {
        return basePay;
    }

    let billableMissingHours = Math.floor(remainingMissingSeconds / 3600);
    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = billableMissingHours * deductionRatePerHour;

    let netPay = basePay - salaryDeduction;

    return netPay;
}


module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
