import pandas as pd

# File paths
input_file = "disney_movies_original.csv"
output_file = "disney_modified.csv"

# Load the data
df = pd.read_csv(input_file)

# Extract the year from 'release_date' and rename the column to 'year'
df["year"] = pd.to_datetime(df["release_date"]).dt.year

# Remove rows where 'total_gross' is 0
df = df[df["total_gross"] != 0]

# Drop the old 'release_date' column
df.drop(columns=["release_date"], inplace=True)

# Save the modified data to a new CSV file
df.to_csv(output_file, index=False)
