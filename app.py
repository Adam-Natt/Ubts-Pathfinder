import json

# Open and read the JSON file
with open('singapore_coordinates.json', 'r') as file:
    data = json.load(file)

# Print the loaded data
print(data)