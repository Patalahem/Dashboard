FROM public.ecr.aws/lambda/python:3.10

# Copy app files into the Lambda task directory
COPY app /var/task/

# Install Python packages listed in requirements.txt
RUN pip install --upgrade pip
RUN pip install -r /var/task/requirements.txt

# Set the handler function
CMD ["local_test.py"]

