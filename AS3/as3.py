import csv
from datetime import datetime
import plotly
import plotly.plotly as py
import plotly.figure_factory as ff
import plotly.graph_objs as go
import plotly.offline as off
from random import *
import matplotlib as mpl
import matplotlib.pyplot as plt

off.init_notebook_mode(connected=True)

import numpy as np
plotly.tools.set_credentials_file(username='angela97lin', api_key='UMEJ1T8PoegAXQELtDP9')

date_format = "%m/%d/%Y %H:%M:%S"
threshold = 15


#get the number of unique users in study
def get_unique_users(filename):
    unique_users = set()
    with open(filename, 'rb') as file:
        csv_reader = csv.DictReader(file, delimiter=',')
        for row in csv_reader:
            user_id = row['Uid']
            if (user_id not in unique_users):
                unique_users.add(user_id)
    return len(unique_users)

# print get_unique_users('sudokui.csv'); #125
# print get_unique_users('AS2.csv'); #14

#get the number of users who achieved victory and made more than 15 logs
def get_valid_users(filename):
    user_data = {}
    with open(filename, 'rb') as file:
        csv_reader = csv.DictReader(file, delimiter=',')
        for row in csv_reader:
            user_id = row['Uid']
            if (user_id not in user_data):
                user_data[user_id] = []
            user_data[user_id].append(row)

    #delete any data that seems incomplete
    #I used '15' entries as a minimum based on how many actions should
    #be taken via my KLM analysis. This number is still likely to be
    #on the low end and probably does not filter out all erroneous data.
    to_remove = []
    for user in user_data:
        if (len(user_data[user]) < threshold):
            to_remove.append(user)

    #remove any users who did not complete puzzles
    for user in user_data:
        hasVictory = False
        data = user_data[user]
        for entry in data:
            if entry['Name'] == 'victory':
                hasVictory = True
                break
        if not hasVictory:
            to_remove.append(user)

    remove_set = set(to_remove)
    for entry in remove_set:
        del user_data[entry]

    return user_data

# print len(get_valid_users('sudokui.csv').keys())
# print len(get_valid_users('AS2.csv').keys())


def get_user_separated_data(filename):
    user_data = {}
    to_remove = []

    with open(filename, 'rb') as file:
        csv_reader = csv.DictReader(file, delimiter=',')
        for row in csv_reader:
            user_id = row['Uid']
            if (user_id not in user_data):
                user_data[user_id] = []
            user_data[user_id].append(row)


    #remove any users who did not complete puzzles
    for user in user_data:
        hasVictory = False
        data = user_data[user]
        for entry in data:
            if entry['Name'] == 'victory':
                hasVictory = True
                break
        if not hasVictory:
            to_remove.append(user)

    #delete any data that seems incomplete
    #I used '15' entries as a minimum based on how many actions should
    #be taken via my KLM analysis. This number is still likely to be
    #on the low end and probably does not filter out all erroneous data.
    for user in user_data:
        if (len(user_data[user]) < threshold):
            to_remove.append(user)

    #sort user play times
    for user in user_data:
        data = user_data[user]
        data.sort(key=lambda x: datetime.strptime(x['Timestamp'], date_format))

    new_entries = {}
    for user in user_data:
        entries = user_data[user]
        entry_num = 1
        prev_index = 0
        for index_i in range(len(entries)-1):
            prev = entries[index_i]['Timestamp']
            curr = entries[index_i+1]['Timestamp']
            prev_time = datetime.strptime(prev, date_format)
            curr_time = datetime.strptime(curr, date_format)
            diff = curr_time - prev_time
            diff_secs = diff.total_seconds()
            two_hours_in_seconds = 2 * 60 * 60
            if (prev_time.date() != curr_time.date() or diff_secs > two_hours_in_seconds):
                to_remove.append(user)
                #print user, diff.days, curr_time, prev_time, index_i, len(entries)-index_i
                if index_i - prev_index > threshold:
                    hasVictory = False
                    for i in range(prev_index, index_i):
                        if entries[index_i]['Name'] == 'victory':
                            hasVictory = True
                            break
                    if hasVictory:
                        new_user_id = user + "_" + str(entry_num)
                        new_entries[new_user_id] = entries[prev_index:index_i + 1]
                        prev_index = index_i
                        entry_num += 1

    #remove any users who did not complete puzzles, checking for new ones now
    for user in new_entries:
        hasVictory = False
        data = new_entries[user]
        for entry in data:
            if entry['Name'] == 'victory':
                hasVictory = True
                user_data[user] = data
                break

    remove_set = set(to_remove)
    for entry in remove_set:
        del user_data[entry]

    return user_data


user_data_a = get_user_separated_data('sudokui.csv')
user_data_b = get_user_separated_data('AS2.csv')


# print len(user_data_a.keys()) #35
# print len(user_data_b.keys()) #14

def get_number_of_victories(user_data):
    victories = 0
    for user in user_data:
        entries = user_data[user]
        for entry in entries:
            name = entry['Name']
            if name == 'victory':
                victories += 1
    return victories

# print "victories for a:", get_number_of_victories(user_data_a) #192
# print "victories for b:", get_number_of_victories(user_data_b) #93

#get the average amount of time spent on each puzzle based on
def get_average_time_spent(user_data):
    total_time = 0
    for user in user_data:
        entries = user_data[user]
        start = entries[0]['Timestamp']
        end = entries[-1]['Timestamp']
        start_time = datetime.strptime(start, date_format)
        end_time = datetime.strptime(end, date_format)
        diff = end_time - start_time
        total_time += diff.total_seconds()
    print "total time:", total_time
    print "sessions:", len(user_data.keys())
    return (total_time/len(user_data.keys()))

# print get_average_time_spent(user_data_a)
# print get_average_time_spent(user_data_b)

#get the average amount of time spent on each puzzle based on when setup and victory are logged
#any victories that are logged without a previous setup are ignored
def get_time_per_puzzle(user_data):
    time_d = {}
    for user in user_data:
        start = None
        end = None
        entries = user_data[user]
        for entry in entries:
            if entry['Name'] == 'setupgame':
                start = entry['Timestamp']
            elif entry['Name'] == 'victory' and start != None:
                end = entry['Timestamp']
                start_time = datetime.strptime(start, date_format)
                end_time = datetime.strptime(end, date_format)
                diff = (end_time - start_time).total_seconds()
                start = None
                end = None
                if diff < 1500:
                    if user not in time_d:
                        time_d[user] = []
                    time_d[user].append(diff)
    return time_d

time_a = get_time_per_puzzle(user_data_a)
time_b = get_time_per_puzzle(user_data_b)

# print time_a
# print time_b

def get_average_time_per_user(user_data):
    avg_d = {}
    for user in user_data:
        data = user_data[user]
        avg = sum(data)/len(data)
        avg_d[user] = avg

    #also print avg of avg

    total_avgs = 0.0
    for user in avg_d:
        total_avgs += avg_d[user]

    avg_of_avgs = total_avgs / (len(avg_d.keys()))
    print "overall avg:", avg_of_avgs
    return avg_d

avg_user_a = get_average_time_per_user(time_a)
avg_user_b = get_average_time_per_user(time_b)


def get_time_list(time_data):
    time_list = []
    for user in time_data:
        data = time_data[user]
        for entry in data:
            if entry < 1000:
                time_list.append(entry)
    return time_list

def plot_boxplot():
    xa = get_time_list(time_a)
    xb = get_time_list(time_b)
    plt.boxplot([xa, xb], patch_artist=True)
    plt.xticks([1, 2], ['A', 'B'])
    plt.show()

plot_boxplot()
#get the estimated number of clicks per task
def get_number_clicks(user_data):
    clicks_d = {}
    for user in user_data:
        start = None
        end = None
        isCounting = False
        entries = user_data[user]
        numberOfClicks = 0
        for entry in entries:
            if isCounting:
                event_name = entry['Name']
                event_target = entry['Target']
                if event_name == 'mousedown' and "sudoku-answer" in event_target:
                    numberOfClicks += 1

            if entry['Name'] == 'setupgame':
                start = entry['Timestamp']
                isCounting = True
            elif entry['Name'] == 'victory' and start != None:
                if user not in clicks_d:
                    clicks_d[user] = []
                clicks_d[user].append(numberOfClicks)
                start = None
                end = None
                isCounting = False
                numberOfClicks = 0

    avg_clicks_d = {}
    for user in clicks_d:
        data = clicks_d[user]
        avg = sum(data)/len(data)
        avg_clicks_d[user] = avg

    #also print avg of avg

    total_avgs = 0.0
    for user in avg_clicks_d:
        total_avgs += avg_clicks_d[user]

    avg_of_avgs = total_avgs / (len(avg_clicks_d.keys()))
    print "overall avg # of clicks:", avg_of_avgs


    return clicks_d

print "number of clicks for users in A:", get_number_clicks(user_data_a)
print "number of clicks for users in B:", get_number_clicks(user_data_b)


#get the estimated number of key presses per task
def get_number_presses(user_data):
    pressed_d = {}
    for user in user_data:
        start = None
        end = None
        isCounting = False
        entries = user_data[user]
        numberKeyPresses = 0
        for entry in entries:
            if isCounting:
                event_name = entry['Name']
                event_target = entry['Target']
                if (event_name == 'moveCells' or event_name == 'numberEntered'):
                    numberKeyPresses += 1

            if entry['Name'] == 'setupgame':
                start = entry['Timestamp']
                isCounting = True
            elif entry['Name'] == 'victory' and start != None:
                if user not in pressed_d:
                    pressed_d[user] = []
                pressed_d[user].append(numberKeyPresses)
                start = None
                end = None
                isCounting = False
                numberKeyPresses = 0

    avg_presses_d = {}
    for user in pressed_d:
        data = pressed_d[user]
        avg = sum(data)/len(data)
        avg_presses_d[user] = avg

    #also print avg of avg

    total_avgs = 0.0
    for user in avg_presses_d:
        total_avgs += avg_presses_d[user]

    avg_of_avgs = total_avgs / (len(avg_presses_d.keys()))
    print "overall avg # of presses:", avg_of_avgs


    return pressed_d

get_number_presses(user_data_a)
get_number_presses(user_data_b)
#print "number of presses for users in A:", get_number_presses(user_data_a)
#print "number of presses for users in B:", get_number_presses(user_data_b)


#get the estimated number of key presses per task
def get_cell_movement(user_data):
    pressed_d = {}
    for user in user_data:
        start = None
        end = None
        isCounting = False
        entries = user_data[user]
        numberKeyPresses = 0
        for entry in entries:
            if isCounting:
                event_name = entry['Name']
                event_target = entry['Target']
                if (event_name == 'moveCells'):
                    numberKeyPresses += 1
            if start is None and entry['Name'] == 'keydown' or (entry['Name'] == 'mousedown' and 'sudoku-answer' in entry['Target']):
                start = entry['Timestamp']
                isCounting = True
            elif entry['Name'] == 'numberEntered' and start is not None:
                if user not in pressed_d:
                    pressed_d[user] = []

                pressed_d[user].append(numberKeyPresses)
                start = None
                end = None
                isCounting = False
                numberKeyPresses = 0

    users_to_delete = []

    for user in pressed_d:
        all_zeroes = True
        data = pressed_d[user]
        for entry in data:
            if entry != 0:
                all_zeroes = False
                break
        if all_zeroes:
            users_to_delete.append(user)

    for user in users_to_delete:
        del pressed_d[user]

    #print pressed_d
    avg_presses_d = {}
    for user in pressed_d:
        data = pressed_d[user]
        avg = float(sum(data))/len(data)
        avg_presses_d[user] = avg
    #print avg_presses_d
    #also print avg of avg

    total_avgs = 0.0
    for user in avg_presses_d:
        total_avgs += avg_presses_d[user]

    avg_of_avgs = total_avgs / (len(avg_presses_d.keys()))
    #print "overall avg # of moved cells:", avg_of_avgs


    return pressed_d

get_cell_movement(user_data_b)







xa = get_time_list(time_a)
xb = get_time_list(time_b)

zeroes = np.full(len(xa), 0)
twos = np.full(len(xb), 2)
#scatter plot
N = 500

trace0 = go.Scatter(
    x = xa,
    y = zeroes,
    name = 'A',
    mode = 'markers',
    marker = dict(
        size = 10,
        color = 'rgba(152, 0, 0, .8)',
        line = dict(
            width = 2,
            color = 'rgb(0, 0, 0)'
        )
    )
)

trace1 = go.Scatter(
    x = xb,
    y = twos,
    name = 'B',
    mode = 'markers',
    marker = dict(
        size = 10,
        color = 'rgba(255, 182, 193, .9)',
        line = dict(
            width = 2,
        )
    )
)

data = [trace0, trace1]

layout = dict(title = 'Styled Scatter',
              yaxis = dict(zeroline = False),
              xaxis = dict(zeroline = False)
             )

fig = dict(data=data, layout=layout)
py.iplot(fig, filename='styled-scatter')
